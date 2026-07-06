using System;
using System.Collections.Generic;

namespace AIChatBot.Models.Responses
{
    public class ConversationDetailResponse
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<MessageResponse> Messages { get; set; } = new List<MessageResponse>();
    }
}
