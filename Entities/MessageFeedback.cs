using System;

namespace AIChatBot.Entities
{
    public enum FeedbackType
    {
        Like,
        Dislike
    }

    public class MessageFeedback
    {
        public int Id { get; set; }
        public int MessageId { get; set; }
        public int UserId { get; set; }
        public FeedbackType FeedbackType { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public User? User { get; set; }
        public Message? Message { get; set; }
    }
}
