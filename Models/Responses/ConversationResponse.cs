using System;

namespace AIChatBot.Models.Responses
{
    public class ConversationResponse
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string SelectedModel { get; set; } = string.Empty;
        public bool IsPinned { get; set; }
        public DateTime? PinnedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
