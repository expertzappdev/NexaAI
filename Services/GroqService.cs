using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using AIChatBot.Configurations;

namespace AIChatBot.Services
{
    public class GroqService : IGroqService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly GroqSettings _settings;
        private readonly ILogger<GroqService> _logger;

        public GroqService(
            IHttpClientFactory httpClientFactory,
            IOptions<GroqSettings> settings,
            ILogger<GroqService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task<GroqResponse> SendMessageAsync(
            List<GroqMessage> chatHistory,
            string? modelOverride = null,
            Action<string>? onChunkReceived = null,
            CancellationToken cancellationToken = default)
        {
            var stopwatch = Stopwatch.StartNew();
            var client = _httpClientFactory.CreateClient("GroqClient");

            var model = modelOverride ?? _settings.DefaultModel;
            var requestBody = new GroqRequest
            {
                Model = model,
                Messages = chatHistory,
                Stream = onChunkReceived != null
            };

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
            {
                Content = httpContent
            };

            // Headers
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);

            _logger.LogInformation("Sending chat request to Groq. Model: {Model}. History size: {Count} messages. Streaming: {Stream}", 
                model, chatHistory.Count, requestBody.Stream);

            try
            {
                if (onChunkReceived != null)
                {
                    var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
                    stopwatch.Stop();

                    _logger.LogInformation("Groq stream headers completed in {ElapsedMs}ms with Status Code: {StatusCode}", 
                        stopwatch.ElapsedMilliseconds, response.StatusCode);

                    if (!response.IsSuccessStatusCode)
                    {
                        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                        _logger.LogError("Groq API returned error. Status: {Status}. Body: {Body}", 
                            response.StatusCode, responseBody);

                        if (response.StatusCode == HttpStatusCode.Unauthorized)
                        {
                            throw new UnauthorizedAccessException("Groq API key is invalid or unauthorized.");
                        }

                        if ((int)response.StatusCode == 429)
                        {
                            throw new HttpRequestException("Groq API rate limit exceeded.", null, HttpStatusCode.TooManyRequests);
                        }

                        throw new HttpRequestException($"Groq API request failed with status code {response.StatusCode}.", null, response.StatusCode);
                    }

                    using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                    using var reader = new System.IO.StreamReader(stream);
                    string? line;
                    var fullContent = new StringBuilder();
                    var streamOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    string lastChoiceId = Guid.NewGuid().ToString();

                    while ((line = await reader.ReadLineAsync(cancellationToken)) != null)
                    {
                        cancellationToken.ThrowIfCancellationRequested();
                        if (line.StartsWith("data: "))
                        {
                            var data = line.Substring(6).Trim();
                            if (data == "[DONE]")
                                break;

                            try
                            {
                                var chunk = JsonSerializer.Deserialize<GroqStreamChunk>(data, streamOptions);
                                if (chunk != null)
                                {
                                    if (!string.IsNullOrEmpty(chunk.Id))
                                    {
                                        lastChoiceId = chunk.Id;
                                    }

                                    var text = chunk.Choices?[0]?.Delta?.Content;
                                    if (!string.IsNullOrEmpty(text))
                                    {
                                        fullContent.Append(text);
                                        onChunkReceived(text);
                                    }
                                }
                            }
                            catch
                            {
                                // ignore parse exceptions
                            }
                        }
                    }

                    return new GroqResponse
                    {
                        Id = lastChoiceId,
                        Choices = new List<GroqChoice>
                        {
                            new GroqChoice
                            {
                                Message = new GroqMessage { Role = "assistant", Content = fullContent.ToString() }
                            }
                        },
                        Usage = new GroqUsage
                        {
                            PromptTokens = 0,
                            CompletionTokens = 0,
                            TotalTokens = 0
                        },
                        Model = model
                    };
                }

                var responseNormal = await client.SendAsync(request, cancellationToken);
                stopwatch.Stop();

                _logger.LogInformation("Groq request completed in {ElapsedMs}ms with Status Code: {StatusCode}", 
                    stopwatch.ElapsedMilliseconds, responseNormal.StatusCode);

                var responseBodyNormal = await responseNormal.Content.ReadAsStringAsync(cancellationToken);

                if (!responseNormal.IsSuccessStatusCode)
                {
                    _logger.LogError("Groq API returned error. Status: {Status}. Body: {Body}", 
                        responseNormal.StatusCode, responseBodyNormal);

                    if (responseNormal.StatusCode == HttpStatusCode.Unauthorized)
                    {
                        throw new UnauthorizedAccessException("Groq API key is invalid or unauthorized.");
                    }

                    if ((int)responseNormal.StatusCode == 429)
                    {
                        throw new HttpRequestException("Groq API rate limit exceeded.", null, HttpStatusCode.TooManyRequests);
                    }

                    throw new HttpRequestException($"Groq API request failed with status code {responseNormal.StatusCode}.", null, responseNormal.StatusCode);
                }

                var normalOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<GroqResponse>(responseBodyNormal, normalOptions);

                if (result == null || result.Choices == null || result.Choices.Count == 0)
                {
                    throw new InvalidOperationException("Groq returned an empty or invalid response structure.");
                }

                return result;
            }
            catch (OperationCanceledException)
            {
                stopwatch.Stop();
                _logger.LogWarning("Groq request timed out or was cancelled after {ElapsedMs}ms.", stopwatch.ElapsedMilliseconds);
                throw;
            }
            catch (Exception ex) when (ex is not UnauthorizedAccessException && ex is not HttpRequestException && ex is not OperationCanceledException)
            {
                stopwatch.Stop();
                _logger.LogError(ex, "An unexpected error occurred while communicating with Groq.");
                throw;
            }
        }

        public Task<GroqResponse> SendMessageAsync(
            List<GroqMessage> chatHistory,
            string? modelOverride,
            CancellationToken cancellationToken)
        {
            return SendMessageAsync(chatHistory, modelOverride, null, cancellationToken);
        }
    }
}
