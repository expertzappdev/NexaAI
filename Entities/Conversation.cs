using System;
using System.Collections.Generic;

namespace AIChatBot.Entities
{
    public class Conversation
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public User? User { get; set; }
        public ICollection<Message> Messages { get; set; } = new List<Message>();
    }
}
