using System;
using AIChatBot.Entities;

namespace AIChatBot.Services
{
    public interface ITokenService
    {
        (string Token, DateTime ExpiresAt) GenerateToken(User user);
    }
}
