using System;

namespace AIChatBot.Models.Responses
{
    public class AuthResponse
    {
        public bool Success { get; set; }
        public string? Token { get; set; }
        public string? ErrorMessage { get; set; }
        public string? Email { get; set; }
        public string? Name { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }
}
