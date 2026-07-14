using System.ComponentModel.DataAnnotations;

namespace AIChatBot.Models.Requests
{
    public class SubmitFeedbackRequest
    {
        [Required]
        public int MessageId { get; set; }

        [Required]
        [RegularExpression("^(Like|Dislike)$", ErrorMessage = "FeedbackType must be either 'Like' or 'Dislike'.")]
        public string FeedbackType { get; set; } = string.Empty;
    }
}
