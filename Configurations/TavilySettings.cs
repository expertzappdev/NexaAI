using System;

namespace AIChatBot.Configurations
{
    public class TavilySettings
    {
        private string _apiKey = string.Empty;

        public string ApiKey
        {
            get
            {
                return string.IsNullOrWhiteSpace(_apiKey) 
                    ? (Environment.GetEnvironmentVariable("TAVILY_API_KEY") ?? string.Empty) 
                    : _apiKey;
            }
            set => _apiKey = value;
        }

        public string BaseUrl { get; set; } = "https://api.tavily.com";
    }
}
