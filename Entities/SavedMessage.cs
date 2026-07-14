using System;

namespace AIChatBot.Entities
{
    public class SavedMessage
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int MessageId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public User? User { get; set; }
        public Message? Message { get; set; }
    }
}
