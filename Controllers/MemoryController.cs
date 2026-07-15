using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AIChatBot.Data;
using AIChatBot.Entities;

namespace AIChatBot.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/memories")]
    public class MemoryController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MemoryController(ApplicationDbContext context)
        {
            _context = context;
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

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
        {
            var userId = GetCurrentUserId();
            var memories = await _context.UserMemories
                .Where(m => m.UserId == userId)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync(cancellationToken);
            return Ok(memories);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateMemoryRequest request, CancellationToken cancellationToken)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Content))
            {
                return BadRequest(new { ErrorMessage = "Title and Content are required." });
            }

            var userId = GetCurrentUserId();
            var memory = new UserMemory
            {
                UserId = userId,
                Title = request.Title.Trim(),
                Content = request.Content.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.UserMemories.Add(memory);
            await _context.SaveChangesAsync(cancellationToken);

            return StatusCode(201, memory);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateMemoryRequest request, CancellationToken cancellationToken)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Content))
            {
                return BadRequest(new { ErrorMessage = "Title and Content are required." });
            }

            var userId = GetCurrentUserId();
            var memory = await _context.UserMemories
                .FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId, cancellationToken);

            if (memory == null)
            {
                return NotFound(new { ErrorMessage = "Memory not found." });
            }

            memory.Title = request.Title.Trim();
            memory.Content = request.Content.Trim();
            memory.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            return Ok(memory);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
        {
            var userId = GetCurrentUserId();
            var memory = await _context.UserMemories
                .FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId, cancellationToken);

            if (memory == null)
            {
                return NotFound(new { ErrorMessage = "Memory not found." });
            }

            _context.UserMemories.Remove(memory);
            await _context.SaveChangesAsync(cancellationToken);

            return Ok(new { Success = true });
        }
    }

    public class CreateMemoryRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }

    public class UpdateMemoryRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }
}
