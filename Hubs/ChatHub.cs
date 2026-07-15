using System;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Concurrent;
using System.Threading;
using AIChatBot.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace AIChatBot.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly IConversationService _conversationService;
        private static readonly ConcurrentDictionary<string, CancellationTokenSource> _activeRequests = 
            new ConcurrentDictionary<string, CancellationTokenSource>();

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

        public Task StopGenerating()
        {
            if (_activeRequests.TryGetValue(Context.ConnectionId, out var cts))
            {
                try
                {
                    cts.Cancel();
                }
                catch (Exception)
                {
                    // Ignore transient exceptions on cancel
                }
            }
            return Task.CompletedTask;
        }

        public async Task SendMessage(int conversationId, string message, string model)
        {
            var cts = new CancellationTokenSource();
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cts.Token, Context.ConnectionAborted);
            _activeRequests[Context.ConnectionId] = cts;

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
                    async (chunk) =>
                    {
                        await Clients.Caller.SendAsync("ReceiveChunk", chunk);
                    },
                    linkedCts.Token);

                // Send assistant response back to client
                await Clients.Caller.SendAsync("ReceiveMessage", new
                {
                    id = chatResponse.MessageId,
                    role = "assistant",
                    content = chatResponse.Message,
                    createdAt = DateTime.UtcNow,
                    model = chatResponse.Model,
                    totalTokens = chatResponse.TotalTokens,
                    isStopped = chatResponse.IsStopped
                });
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
                _activeRequests.TryRemove(Context.ConnectionId, out _);
                cts.Dispose();
                // Ensure typing stopped is always triggered even on errors
                await Clients.Caller.SendAsync("TypingStopped");
            }
        }

        public async Task RegenerateResponse(int messageId, string model)
        {
            var cts = new CancellationTokenSource();
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cts.Token, Context.ConnectionAborted);
            _activeRequests[Context.ConnectionId] = cts;

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
                    async (chunk) =>
                    {
                        await Clients.Caller.SendAsync("ReceiveChunk", chunk);
                    },
                    linkedCts.Token);

                // Send regenerated response details back to client
                await Clients.Caller.SendAsync("RegenerateComplete", new
                {
                    messageId = messageId,
                    content = chatResponse.Message,
                    model = chatResponse.Model,
                    totalTokens = chatResponse.TotalTokens,
                    isStopped = chatResponse.IsStopped
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
                _activeRequests.TryRemove(Context.ConnectionId, out _);
                cts.Dispose();
                // Ensure typing stopped is always triggered
                await Clients.Caller.SendAsync("TypingStopped");
            }
        }

        public async Task EditMessage(int messageId, string newContent, string model)
        {
            var cts = new CancellationTokenSource();
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cts.Token, Context.ConnectionAborted);
            _activeRequests[Context.ConnectionId] = cts;

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
                    async (chunk) =>
                    {
                        await Clients.Caller.SendAsync("ReceiveChunk", chunk);
                    },
                    linkedCts.Token);

                // Broadcast the updated conversation state
                await Clients.Caller.SendAsync("EditMessageComplete", new
                {
                    editedMessageId = messageId,
                    newContent = newContent,
                    editedAt = DateTime.UtcNow,
                    assistantResponse = new
                    {
                        id = chatResponse.MessageId,
                        role = "assistant",
                        content = chatResponse.Message,
                        createdAt = DateTime.UtcNow,
                        model = chatResponse.Model,
                        totalTokens = chatResponse.TotalTokens,
                        isStopped = chatResponse.IsStopped
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
                _activeRequests.TryRemove(Context.ConnectionId, out _);
                cts.Dispose();
                await Clients.Caller.SendAsync("TypingStopped");
            }
        }
    }
}
