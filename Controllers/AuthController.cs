using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using AIChatBot.Entities;
using AIChatBot.Models.Requests;
using AIChatBot.Models.Responses;
using AIChatBot.Repositories;
using AIChatBot.Services;

namespace AIChatBot.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IRepository<User> _userRepository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly ITokenService _tokenService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IRepository<User> userRepository,
            IPasswordHasher passwordHasher,
            ITokenService tokenService,
            ILogger<AuthController> logger)
        {
            _userRepository = userRepository;
            _passwordHasher = passwordHasher;
            _tokenService = tokenService;
            _logger = logger;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var emailNormalized = request.Email.Trim().ToLowerInvariant();
            
            // Check if user already exists
            var existingUser = await _userRepository.GetQueryable()
                .FirstOrDefaultAsync(u => u.Email == emailNormalized, cancellationToken);
            if (existingUser != null)
            {
                return BadRequest(new AuthResponse { Success = false, ErrorMessage = "A user with this email is already registered." });
            }

            var user = new User
            {
                Name = request.Name,
                Email = emailNormalized,
                PasswordHash = _passwordHasher.HashPassword(request.Password),
                CreatedAt = DateTime.UtcNow
            };

            await _userRepository.AddAsync(user, cancellationToken);
            await _userRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Successfully registered user {Email}", user.Email);

            var (token, expiresAt) = _tokenService.GenerateToken(user);
            return Ok(new AuthResponse
            {
                Success = true,
                Token = token,
                User = new AuthUserDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email
                }
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var emailNormalized = request.Email.Trim().ToLowerInvariant();
            
            var user = await _userRepository.GetQueryable()
                .FirstOrDefaultAsync(u => u.Email == emailNormalized, cancellationToken);
            if (user == null || !_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
            {
                return Unauthorized(new AuthResponse { Success = false, ErrorMessage = "Invalid email or password." });
            }

            _logger.LogInformation("Successfully authenticated user {Email}", user.Email);

            var (token, expiresAt) = _tokenService.GenerateToken(user);
            return Ok(new AuthResponse
            {
                Success = true,
                Token = token,
                User = new AuthUserDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email
                }
            });
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { Success = false, ErrorMessage = "Invalid token claims." });
            }

            var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
            if (user == null)
            {
                return NotFound(new { Success = false, ErrorMessage = "User not found." });
            }

            return Ok(new
            {
                Success = true,
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                CreatedAt = user.CreatedAt
            });
        }
    }
}
