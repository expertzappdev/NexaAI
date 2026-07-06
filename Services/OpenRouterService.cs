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
    public class OpenRouterService : IOpenRouterService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly OpenRouterSettings _settings;
        private readonly ILogger<OpenRouterService> _logger;

        public OpenRouterService(
            IHttpClientFactory httpClientFactory,
            IOptions<OpenRouterSettings> settings,
            ILogger<OpenRouterService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task<OpenRouterResponse> SendMessageAsync(
            List<OpenRouterMessage> chatHistory,
            string? modelOverride = null,
            CancellationToken cancellationToken = default)
        {
            var stopwatch = Stopwatch.StartNew();
            var client = _httpClientFactory.CreateClient("OpenRouterClient");

            var model = modelOverride ?? _settings.DefaultModel;
            var requestBody = new OpenRouterRequest
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
            request.Headers.Add("HTTP-Referer", "https://yourdomain.com");
            request.Headers.Add("X-Title", "AI Chatbot");

            _logger.LogInformation("Sending chat request to OpenRouter. Model: {Model}. History size: {Count} messages.", 
                model, chatHistory.Count);

            try
            {
                var response = await client.SendAsync(request, cancellationToken);
                stopwatch.Stop();

                _logger.LogInformation("OpenRouter request completed in {ElapsedMs}ms with Status Code: {StatusCode}", 
                    stopwatch.ElapsedMilliseconds, response.StatusCode);

                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("OpenRouter API returned error. Status: {Status}. Body: {Body}", 
                        response.StatusCode, responseBody);

                    if (response.StatusCode == HttpStatusCode.Unauthorized)
                    {
                        throw new UnauthorizedAccessException("OpenRouter API key is invalid or unauthorized.");
                    }

                    if ((int)response.StatusCode == 429)
                    {
                        throw new HttpRequestException("OpenRouter API rate limit exceeded.", null, HttpStatusCode.TooManyRequests);
                    }

                    // Try to parse the error message if possible
                    try
                    {
                        var errorObj = JsonSerializer.Deserialize<OpenRouterErrorResponse>(responseBody);
                        if (errorObj?.Error != null)
                        {
                            throw new HttpRequestException($"OpenRouter Error: {errorObj.Error.Message} (Code: {errorObj.Error.Code})", null, response.StatusCode);
                        }
                    }
                    catch (JsonException) { }

                    throw new HttpRequestException($"OpenRouter API request failed with status code {response.StatusCode}.", null, response.StatusCode);
                }

                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<OpenRouterResponse>(responseBody, options);

                if (result == null || result.Choices == null || result.Choices.Count == 0)
                {
                    throw new InvalidOperationException("OpenRouter returned an empty or invalid response structure.");
                }

                return result;
            }
            catch (OperationCanceledException)
            {
                stopwatch.Stop();
                _logger.LogWarning("OpenRouter request timed out or was cancelled after {ElapsedMs}ms.", stopwatch.ElapsedMilliseconds);
                throw;
            }
            catch (Exception ex) when (ex is not UnauthorizedAccessException && ex is not HttpRequestException && ex is not OperationCanceledException)
            {
                stopwatch.Stop();
                _logger.LogError(ex, "An unexpected error occurred while communicating with OpenRouter.");
                throw;
            }
        }
    }
}
