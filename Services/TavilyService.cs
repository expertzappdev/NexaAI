using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using AIChatBot.Configurations;

namespace AIChatBot.Services
{
    public class TavilySearchRequest
    {
        [JsonPropertyName("api_key")]
        public string ApiKey { get; set; } = string.Empty;

        [JsonPropertyName("query")]
        public string Query { get; set; } = string.Empty;

        [JsonPropertyName("search_depth")]
        public string SearchDepth { get; set; } = "basic";

        [JsonPropertyName("max_results")]
        public int MaxResults { get; set; } = 5;
    }

    public class TavilySearchResult
    {
        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }

    public class TavilySearchResponse
    {
        [JsonPropertyName("results")]
        public List<TavilySearchResult> Results { get; set; } = new List<TavilySearchResult>();
    }

    public class TavilyService : ITavilyService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly TavilySettings _settings;
        private readonly ILogger<TavilyService> _logger;

        public TavilyService(
            IHttpClientFactory httpClientFactory,
            IOptions<TavilySettings> settings,
            ILogger<TavilyService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task<string> SearchAsync(string query, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_settings.ApiKey))
            {
                _logger.LogWarning("Tavily API key is not configured.");
                return "Error: Tavily API key is not configured.";
            }

            try
            {
                var client = _httpClientFactory.CreateClient("TavilyClient");
                var requestBody = new TavilySearchRequest
                {
                    ApiKey = _settings.ApiKey,
                    Query = query
                };

                var json = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                _logger.LogInformation("Sending request to Tavily Search: {Query}", query);
                var response = await client.PostAsync("search", content, cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var errBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError("Tavily Search API returned error: {StatusCode}. Body: {Body}", response.StatusCode, errBody);
                    return $"Error: Tavily Search failed with status code {response.StatusCode}.";
                }

                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                var searchResponse = JsonSerializer.Deserialize<TavilySearchResponse>(responseBody);

                if (searchResponse?.Results == null || searchResponse.Results.Count == 0)
                {
                    return "No relevant web search results found.";
                }

                var sb = new StringBuilder();
                foreach (var result in searchResponse.Results)
                {
                    sb.AppendLine($"Title: {result.Title}");
                    sb.AppendLine($"URL: {result.Url}");
                    sb.AppendLine($"Content: {result.Content}");
                    sb.AppendLine();
                }

                return sb.ToString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during Tavily Search.");
                return $"Error occurred during Tavily Search: {ex.Message}";
            }
        }
    }
}
