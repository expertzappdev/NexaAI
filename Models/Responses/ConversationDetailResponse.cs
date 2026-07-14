using System;
using System.Collections.Generic;

namespace AIChatBot.Models.Responses
{
    public class ConversationDetailResponse
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string SelectedModel { get; set; } = string.Empty;
        public bool IsPinned { get; set; }
        public DateTime? PinnedAt { get; set; }
        public bool IsArchived { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<MessageResponse> Messages { get; set; } = new List<MessageResponse>();
    }
}
