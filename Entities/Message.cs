using System;

namespace AIChatBot.Entities
{
    public class Message
    {
        public int Id { get; set; }
        public int ConversationId { get; set; }
        public string Role { get; set; } = string.Empty; // system, user, assistant
        public string Content { get; set; } = string.Empty;
        
        // Token usage analytics (nullable as they are populated after AI completions)
        public int? PromptTokens { get; set; }
        public int? CompletionTokens { get; set; }
        public int? TotalTokens { get; set; }
        public string? Model { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public bool IsEdited { get; set; } = false;
        public DateTime? EditedAt { get; set; }
        
        public bool IsStopped { get; set; } = false;

        // Navigation properties
        public Conversation? Conversation { get; set; }
    }
}
