namespace AIChatBot.Configurations
{
    public class OpenRouterSettings
    {
        public string ApiKey { get; set; } = string.Empty;
        public string BaseUrl { get; set; } = "https://openrouter.ai/api/v1/";
        public string DefaultModel { get; set; } = "openai/gpt-4o-mini";
    }
}
