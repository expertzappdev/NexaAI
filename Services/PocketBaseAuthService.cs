using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AIChatBot.Services
{
    public class PocketBaseAuthService : IPocketBaseAuthService
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;
        private readonly ILogger<PocketBaseAuthService> _logger;

        public PocketBaseAuthService(HttpClient httpClient, IConfiguration configuration, ILogger<PocketBaseAuthService> logger)
        {
            _httpClient = httpClient;
            _baseUrl = configuration["PocketBase:BaseUrl"] ?? "http://localhost:8090";
            _logger = logger;
        }

        public async Task<bool> ValidateTokenAsync(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return false;

            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/api/collections/users/auth-refresh");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

                var response = await _httpClient.SendAsync(request);
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to validate PocketBase token");
                return false;
            }
        }

        public async Task<string?> GetUserIdFromTokenAsync(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return null;

            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/api/collections/users/auth-refresh");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode) return null;

                var content = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(content);
                if (doc.RootElement.TryGetProperty("record", out var recordObj) && 
                    recordObj.TryGetProperty("id", out var idProp))
                {
                    return idProp.GetString();
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get user ID from PocketBase token");
                return null;
            }
        }
    }
}
