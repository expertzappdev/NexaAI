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

        public async Task SendMessage(int conversationId, string message, string model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(message))
                {
                    await Clients.Caller.SendAsync("ErrorMessage", "Message content cannot be empty.");
                    return;
                }

                // Model Validation
                if (string.IsNullOrWhiteSpace(model))
                {
                    model = "llama-3.1-8b-instant";
                }

                var allowedModels = new System.Collections.Generic.HashSet<string>
                {
                    "llama-3.1-8b-instant",
                    "llama-3.3-70b-versatile",
                    "qwen/qwen3.6-27b",
                    "qwen/qwen3-32b",
                    "groq/compound-mini",
                    "nexa-web-search"
                };

                if (!allowedModels.Contains(model))
                {
                    await Clients.Caller.SendAsync("ErrorMessage", "Invalid model selected.");
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

                // Process conversation and call Groq
                var chatResponse = await _conversationService.ProcessSendMessageAsync(
                    userId,
                    conversationId,
                    message,
                    model,
                    async (status) =>
                    {
                        await Clients.Caller.SendAsync("SearchStatus", status);
                    },
                    Context.ConnectionAborted);

                // Send assistant response back to client
                await Clients.Caller.SendAsync("ReceiveMessage", new
                {
                    role = "assistant",
                    content = chatResponse.Message,
                    createdAt = DateTime.UtcNow,
                    model = chatResponse.Model,
                    totalTokens = chatResponse.TotalTokens
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

        public async Task RegenerateResponse(int messageId, string model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model))
                {
                    model = "llama-3.1-8b-instant";
                }

                var allowedModels = new System.Collections.Generic.HashSet<string>
                {
                    "llama-3.1-8b-instant",
                    "llama-3.3-70b-versatile",
                    "qwen/qwen3.6-27b",
                    "qwen/qwen3-32b",
                    "groq/compound-mini",
                    "nexa-web-search"
                };

                if (!allowedModels.Contains(model))
                {
                    await Clients.Caller.SendAsync("ErrorMessage", "Invalid model selected.");
                    return;
                }

                var userId = GetCurrentUserId();

                // Notify client that typing/processing has started
                await Clients.Caller.SendAsync("TypingStarted");

                // Regenerate response
                var chatResponse = await _conversationService.RegenerateResponseAsync(
                    userId,
                    messageId,
                    model,
                    async (status) =>
                    {
                        await Clients.Caller.SendAsync("SearchStatus", status);
                    },
                    Context.ConnectionAborted);

                // Send regenerated response details back to client
                await Clients.Caller.SendAsync("RegenerateComplete", new
                {
                    messageId = messageId,
                    content = chatResponse.Message,
                    model = chatResponse.Model,
                    totalTokens = chatResponse.TotalTokens
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                await Clients.Caller.SendAsync("ErrorMessage", "You are not authorized: " + ex.Message);
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("ErrorMessage", "Failed to regenerate response: " + ex.Message);
            }
            finally
            {
                // Ensure typing stopped is always triggered
                await Clients.Caller.SendAsync("TypingStopped");
            }
        }

        public async Task EditMessage(int messageId, string newContent, string model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(newContent))
                {
                    await Clients.Caller.SendAsync("ErrorMessage", "Message content cannot be empty.");
                    return;
                }

                if (string.IsNullOrWhiteSpace(model))
                {
                    model = "llama-3.1-8b-instant";
                }

                var allowedModels = new System.Collections.Generic.HashSet<string>
                {
                    "llama-3.1-8b-instant",
                    "llama-3.3-70b-versatile",
                    "qwen/qwen3.6-27b",
                    "qwen/qwen3-32b",
                    "groq/compound-mini",
                    "nexa-web-search"
                };

                if (!allowedModels.Contains(model))
                {
                    await Clients.Caller.SendAsync("ErrorMessage", "Invalid model selected.");
                    return;
                }

                var userId = GetCurrentUserId();

                // Notify client that typing/processing has started
                await Clients.Caller.SendAsync("TypingStarted");

                // Execute edit and regenerate
                var chatResponse = await _conversationService.EditMessageAsync(
                    userId,
                    messageId,
                    newContent,
                    model,
                    async (status) =>
                    {
                        await Clients.Caller.SendAsync("SearchStatus", status);
                    },
                    Context.ConnectionAborted);

                // Broadcast the updated conversation state
                await Clients.Caller.SendAsync("EditMessageComplete", new
                {
                    editedMessageId = messageId,
                    newContent = newContent,
                    editedAt = DateTime.UtcNow,
                    assistantResponse = new
                    {
                        role = "assistant",
                        content = chatResponse.Message,
                        createdAt = DateTime.UtcNow,
                        model = chatResponse.Model,
                        totalTokens = chatResponse.TotalTokens
                    }
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                await Clients.Caller.SendAsync("ErrorMessage", "You are not authorized: " + ex.Message);
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("ErrorMessage", "Failed to edit message: " + ex.Message);
            }
            finally
            {
                await Clients.Caller.SendAsync("TypingStopped");
            }
        }
    }
}
