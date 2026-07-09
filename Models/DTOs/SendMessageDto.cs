using System.ComponentModel.DataAnnotations;

namespace AIChatBot.Models.DTOs
{
    public class SendMessageDto
    {
        [Required]
        public int ConversationId { get; set; }

        [Required]
        [MinLength(1, ErrorMessage = "Message content cannot be empty.")]
        public string Message { get; set; } = string.Empty;

        public string Model { get; set; } = "llama-3.1-8b-instant";
    }
}
