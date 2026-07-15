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
using System.Runtime.CompilerServices;
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
            CancellationToken cancellationToken = default)
        {
            var stopwatch = Stopwatch.StartNew();
            var client = _httpClientFactory.CreateClient("GroqClient");

            var model = modelOverride ?? _settings.DefaultModel;
            var requestBody = new GroqRequest
            {
                Model = model,
                Messages = chatHistory
            };

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
            {
                Content = httpContent
            };

            // Headers
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);

            _logger.LogInformation("Sending chat request to Groq. Model: {Model}. History size: {Count} messages.", 
                model, chatHistory.Count);

            try
            {
                var response = await client.SendAsync(request, cancellationToken);
                stopwatch.Stop();

                _logger.LogInformation("Groq request completed in {ElapsedMs}ms with Status Code: {StatusCode}", 
                    stopwatch.ElapsedMilliseconds, response.StatusCode);

                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
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

                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<GroqResponse>(responseBody, options);

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

        public async IAsyncEnumerable<GroqStreamResponse> SendMessageStreamAsync(
            List<GroqMessage> chatHistory,
            string? modelOverride = null,
            [EnumeratorCancellation] CancellationToken cancellationToken = default)
        {
            var client = _httpClientFactory.CreateClient("GroqClient");

            var model = modelOverride ?? _settings.DefaultModel;
            var requestBody = new
            {
                model = model,
                messages = chatHistory,
                stream = true,
                stream_options = new { include_usage = true }
            };

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
            {
                Content = httpContent
            };

            // Headers
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);

            _logger.LogInformation("Sending streaming chat request to Groq. Model: {Model}. History size: {Count} messages.", 
                model, chatHistory.Count);

            HttpResponseMessage response;
            try
            {
                response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to connect to Groq API for streaming.");
                throw;
            }

            if (!response.IsSuccessStatusCode)
            {
                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Groq API returned error for streaming. Status: {Status}. Body: {Body}", 
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

            using (var stream = await response.Content.ReadAsStreamAsync(cancellationToken))
            using (var reader = new System.IO.StreamReader(stream))
            {
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

                while (!reader.EndOfStream)
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    var line = await reader.ReadLineAsync();
                    if (string.IsNullOrWhiteSpace(line)) continue;

                    if (line.StartsWith("data: "))
                    {
                        var data = line.Substring(6).Trim();
                        if (data == "[DONE]")
                        {
                            break;
                        }

                        GroqStreamResponse? chunk = null;
                        try
                        {
                            chunk = JsonSerializer.Deserialize<GroqStreamResponse>(data, options);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to deserialize Groq stream chunk: {Data}", data);
                        }

                        if (chunk != null)
                        {
                            yield return chunk;
                        }
                    }
                }
            }
        }
    }
}
