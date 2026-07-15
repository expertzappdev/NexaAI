using System;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Threading;
using System.Collections.Concurrent;
using AIChatBot.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace AIChatBot.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly IConversationService _conversationService;
        private static readonly ConcurrentDictionary<string, CancellationTokenSource> _ctsMap = new();

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

        public void StopGenerating()
        {
            var connectionId = Context.ConnectionId;
            if (_ctsMap.TryGetValue(connectionId, out var cts))
            {
                cts.Cancel();
            }
        }

        public async Task SendMessage(int conversationId, string message, string model)
        {
            var connectionId = Context.ConnectionId;
            var cts = new CancellationTokenSource();
            _ctsMap[connectionId] = cts;

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
                    "groq/compound",
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

                // Link the manual CTS token with the SignalR ConnectionAborted token
                using (var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(Context.ConnectionAborted, cts.Token))
                {
                    // Process conversation and call Groq (with streaming callback)
                    var chatResponse = await _conversationService.ProcessSendMessageAsync(
                        userId,
                        conversationId,
                        message,
                        model,
                        async (status) =>
                        {
                            await Clients.Caller.SendAsync("SearchStatus", status);
                        },
                        async (chunk) =>
                        {
                            await Clients.Caller.SendAsync("ReceiveMessageChunk", chunk);
                        },
                        linkedCts.Token);

                    // Send completion details
                    await Clients.Caller.SendAsync("ReceiveMessageCompleted", new
                    {
                        messageId = chatResponse.Id,
                        model = chatResponse.Model,
                        totalTokens = chatResponse.TotalTokens,
                        content = chatResponse.Message
                    });
                }
            }
            catch (UnauthorizedAccessException ex)
            {
                await Clients.Caller.SendAsync("ErrorMessage", "You are not authorized: " + ex.Message);
            }
            catch (OperationCanceledException)
            {
                // Silence operation canceled logs / expected path when user clicks Stop
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("ErrorMessage", "Failed to process message: " + ex.Message);
            }
            finally
            {
                _ctsMap.TryRemove(connectionId, out _);
                cts.Dispose();
                
                // Ensure typing stopped is always triggered even on errors/cancellation
                await Clients.Caller.SendAsync("TypingStopped");
            }
        }
    }
}
