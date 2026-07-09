using System;

namespace AIChatBot.Configurations
{
    public class GroqSettings
    {
        private string _apiKey = string.Empty;

        public string ApiKey
        {
            get
            {
                return string.IsNullOrWhiteSpace(_apiKey) 
                    ? (Environment.GetEnvironmentVariable("GROQ_API_KEY") ?? string.Empty) 
                    : _apiKey;
            }
            set => _apiKey = value;
        }

        public string BaseUrl { get; set; } = "https://api.groq.com/openai/v1/";
        public string DefaultModel { get; set; } = "llama-3.1-8b-instant";
    }
}