using System.Collections.Generic;

namespace AIChatBot.Models.Responses
{
    public class ErrorResponse
    {
        public bool Success { get; set; } = false;
        public string ErrorMessage { get; set; } = string.Empty;
        public Dictionary<string, string[]>? Errors { get; set; }
    }
}
