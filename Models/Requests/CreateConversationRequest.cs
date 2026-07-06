using System.ComponentModel.DataAnnotations;

namespace AIChatBot.Models.Requests
{
    public class CreateConversationRequest
    {
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;
    }
}
