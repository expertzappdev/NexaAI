using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AIChatBot.Models.Requests;
using AIChatBot.Services;

namespace AIChatBot.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/messages")]
    public class MessageController : ControllerBase
    {
        private readonly IMessageService _messageService;

        public MessageController(IMessageService messageService)
        {
            _messageService = messageService;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || string.IsNullOrWhiteSpace(userIdClaim.Value))
            {
                throw new UnauthorizedAccessException("User identification claim is missing or invalid.");
            }

            if (int.TryParse(userIdClaim.Value, out var userId))
            {
                return userId;
            }

            return Math.Abs(userIdClaim.Value.GetHashCode());
        }

        [HttpGet("saved")]
        public async Task<IActionResult> GetSavedMessages(CancellationToken cancellationToken)
        {
            var userId = GetCurrentUserId();
            var responses = await _messageService.GetSavedMessagesForUserAsync(userId, cancellationToken);
            return Ok(responses);
        }

        [HttpPost("save")]
        public async Task<IActionResult> SaveMessage([FromBody] SaveMessageRequest request, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            var success = await _messageService.SaveMessageAsync(userId, request.MessageId, cancellationToken);
            if (!success)
            {
                return BadRequest(new { message = "Failed to save message. Message not found or access denied." });
            }

            return Ok(new { message = "Response saved." });
        }

        [HttpDelete("save/{messageId:int}")]
        public async Task<IActionResult> UnsaveMessage(int messageId, CancellationToken cancellationToken)
        {
            var userId = GetCurrentUserId();
            var success = await _messageService.UnsaveMessageAsync(userId, messageId, cancellationToken);
            if (!success)
            {
                return NotFound(new { message = "Saved response not found." });
            }

            return Ok(new { message = "Removed from saved." });
        }

        [HttpPost("feedback")]
        public async Task<IActionResult> SubmitFeedback([FromBody] SubmitFeedbackRequest request, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            var success = await _messageService.SubmitFeedbackAsync(userId, request.MessageId, request.FeedbackType, cancellationToken);
            if (!success)
            {
                return BadRequest(new { message = "Failed to submit feedback. Message not found, not assistant role, or access denied." });
            }

            return Ok(new { message = "Feedback submitted." });
        }

        [HttpPut("feedback")]
        public async Task<IActionResult> UpdateFeedback([FromBody] SubmitFeedbackRequest request, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            var success = await _messageService.UpdateFeedbackAsync(userId, request.MessageId, request.FeedbackType, cancellationToken);
            if (!success)
            {
                return BadRequest(new { message = "Failed to update feedback. Message not found, not assistant role, or access denied." });
            }

            return Ok(new { message = "Feedback updated." });
        }

        [HttpDelete("feedback/{messageId:int}")]
        public async Task<IActionResult> DeleteFeedback(int messageId, CancellationToken cancellationToken)
        {
            var userId = GetCurrentUserId();
            var success = await _messageService.DeleteFeedbackAsync(userId, messageId, cancellationToken);
            if (!success)
            {
                return NotFound(new { message = "Feedback not found or access denied." });
            }

            return Ok(new { message = "Feedback removed." });
        }
    }
}
