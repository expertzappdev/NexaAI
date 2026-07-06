using System;
using System.Security.Claims;
using System.Threading.Tasks;
using AIChatBot.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace AIChatBot.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly IConversationService _conversationService;

        public ChatHub(IConversationService conversationService)
        {
            _conversationService = conversationService;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                throw new UnauthorizedAccessException("User identification claim is missing or invalid.");
            }
            return userId;
        }

        public async Task SendMessage(int conversationId, string message)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(message))
                {
                    await Clients.Caller.SendAsync("ErrorMessage", "Message content cannot be empty.");
                    return;
                }

                var userId = GetCurrentUserId();

                // Echo the user's message back to their client to confirm it was received and saved.
                await Clients.Caller.SendAsync("ReceiveMessage", new
                {
                    role = "user",
                    content = message,
                    createdAt = DateTime.UtcNow
                });

                // Notify client that typing/processing has started
                await Clients.Caller.SendAsync("TypingStarted");

                // Process conversation and call OpenRouter
                var chatResponse = await _conversationService.ProcessSendMessageAsync(
                    userId,
                    conversationId,
                    message,
                    Context.ConnectionAborted);

                // Send assistant response back to client
                await Clients.Caller.SendAsync("ReceiveMessage", new
                {
                    role = "assistant",
                    content = chatResponse.Message,
                    createdAt = DateTime.UtcNow
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                await Clients.Caller.SendAsync("ErrorMessage", "You are not authorized: " + ex.Message);
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("ErrorMessage", "Failed to process message: " + ex.Message);
            }
            finally
            {
                // Ensure typing stopped is always triggered even on errors
                await Clients.Caller.SendAsync("TypingStopped");
            }
        }
    }
}
