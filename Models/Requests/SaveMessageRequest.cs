using System.ComponentModel.DataAnnotations;

namespace AIChatBot.Models.Requests
{
    public class SaveMessageRequest
    {
        [Required]
        public int MessageId { get; set; }
    }
}
