namespace AIChatBot.Models.Responses
{
    public class ChatResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        
        // Optional tracking properties
        public string? Model { get; set; }
        public int? TotalTokens { get; set; }
        public bool IsStopped { get; set; }
        public int MessageId { get; set; }
    }
}
