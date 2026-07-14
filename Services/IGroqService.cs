using System.Collections.Generic;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

namespace AIChatBot.Services
{
    public class GroqMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }

    public class GroqRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("messages")]
        public List<GroqMessage> Messages { get; set; } = new List<GroqMessage>();

        [JsonPropertyName("stream")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public bool Stream { get; set; }
    }

    public class GroqResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("choices")]
        public List<GroqChoice> Choices { get; set; } = new List<GroqChoice>();

        [JsonPropertyName("usage")]
        public GroqUsage? Usage { get; set; }

        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;
    }

    public class GroqChoice
    {
        [JsonPropertyName("message")]
        public GroqMessage Message { get; set; } = new GroqMessage();

        [JsonPropertyName("finish_reason")]
        public string FinishReason { get; set; } = string.Empty;
    }

    public class GroqUsage
    {
        [JsonPropertyName("prompt_tokens")]
        public int PromptTokens { get; set; }

        [JsonPropertyName("completion_tokens")]
        public int CompletionTokens { get; set; }

        [JsonPropertyName("total_tokens")]
        public int TotalTokens { get; set; }
    }

    public class GroqStreamChunk
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("choices")]
        public List<GroqStreamChoice> Choices { get; set; } = new List<GroqStreamChoice>();
    }

    public class GroqStreamChoice
    {
        [JsonPropertyName("delta")]
        public GroqStreamDelta Delta { get; set; } = new GroqStreamDelta();

        [JsonPropertyName("finish_reason")]
        public string? FinishReason { get; set; }
    }

    public class GroqStreamDelta
    {
        [JsonPropertyName("role")]
        public string? Role { get; set; }

        [JsonPropertyName("content")]
        public string? Content { get; set; }
    }

    public interface IGroqService
    {
        Task<GroqResponse> SendMessageAsync(
            List<GroqMessage> chatHistory,
            string? modelOverride = null,
            Action<string>? onChunkReceived = null,
            CancellationToken cancellationToken = default);

        Task<GroqResponse> SendMessageAsync(
            List<GroqMessage> chatHistory,
            string? modelOverride,
            CancellationToken cancellationToken);
    }
}
