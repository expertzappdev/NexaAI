using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace AIChatBot.Services
{
    public class OpenRouterMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty; // system, user, assistant

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }

    public class OpenRouterRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("messages")]
        public List<OpenRouterMessage> Messages { get; set; } = new List<OpenRouterMessage>();
    }

    public class OpenRouterResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("choices")]
        public List<OpenRouterChoice> Choices { get; set; } = new List<OpenRouterChoice>();

        [JsonPropertyName("usage")]
        public OpenRouterUsage? Usage { get; set; }

        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;
    }

    public class OpenRouterChoice
    {
        [JsonPropertyName("message")]
        public OpenRouterMessage Message { get; set; } = new OpenRouterMessage();

        [JsonPropertyName("finish_reason")]
        public string FinishReason { get; set; } = string.Empty;
    }

    public class OpenRouterUsage
    {
        [JsonPropertyName("prompt_tokens")]
        public int PromptTokens { get; set; }

        [JsonPropertyName("completion_tokens")]
        public int CompletionTokens { get; set; }

        [JsonPropertyName("total_tokens")]
        public int TotalTokens { get; set; }
    }

    public class OpenRouterErrorDetails
    {
        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("code")]
        public int Code { get; set; }
    }

    public class OpenRouterErrorResponse
    {
        [JsonPropertyName("error")]
        public OpenRouterErrorDetails Error { get; set; } = new OpenRouterErrorDetails();
    }
}
