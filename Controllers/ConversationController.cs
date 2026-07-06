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
    [Route("api/conversations")]
    public class ConversationController : ControllerBase
    {
        private readonly IConversationService _conversationService;

        public ConversationController(IConversationService conversationService)
        {
            _conversationService = conversationService;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                throw new UnauthorizedAccessException("User identification claim is missing or invalid.");
            }
            return userId;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateConversationRequest request, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            var response = await _conversationService.CreateConversationAsync(userId, request.Title, cancellationToken);
            return StatusCode(201, response);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
        {
            var userId = GetCurrentUserId();
            var list = await _conversationService.GetConversationsForUserAsync(userId, cancellationToken);
            return Ok(list);
        }

        [HttpGet("{conversationId:int}")]
        public async Task<IActionResult> GetById(int conversationId, CancellationToken cancellationToken)
        {
            var userId = GetCurrentUserId();
            var conversationDetail = await _conversationService.GetConversationDetailAsync(userId, conversationId, cancellationToken);
            return Ok(conversationDetail);
        }

        [HttpPut("{conversationId:int}")]
        public async Task<IActionResult> Rename(int conversationId, [FromBody] RenameConversationRequest request, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            var success = await _conversationService.RenameConversationAsync(userId, conversationId, request.Title, cancellationToken);
            if (!success)
            {
                return BadRequest(new { Success = false, ErrorMessage = "Failed to rename conversation." });
            }

            return Ok(new { Success = true });
        }

        [HttpDelete("{conversationId:int}")]
        public async Task<IActionResult> Delete(int conversationId, CancellationToken cancellationToken)
        {
            var userId = GetCurrentUserId();
            var success = await _conversationService.DeleteConversationAsync(userId, conversationId, cancellationToken);
            if (!success)
            {
                return BadRequest(new { Success = false, ErrorMessage = "Failed to delete conversation." });
            }

            return Ok(new { Success = true });
        }
    }
}
