using System.ComponentModel.DataAnnotations;

namespace AIChatBot.Models.Requests
{
    public class SendMessageRequest
    {
        [Required]
        public int ConversationId { get; set; }

        [Required]
        [MinLength(1, ErrorMessage = "Message content cannot be empty.")]
        [MaxLength(4000, ErrorMessage = "Message content is too long. Maximum is 4000 characters.")]
        public string Message { get; set; } = string.Empty;
    }
}
