using System;

namespace AIChatBot.Models.Responses
{
    public class SavedMessageResponse
    {
        public int Id { get; set; }
        public int MessageId { get; set; }
        public int ConversationId { get; set; }
        public string ConversationTitle { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
