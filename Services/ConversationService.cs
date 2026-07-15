using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using AIChatBot.Entities;
using AIChatBot.Models.Responses;
using AIChatBot.Repositories;

namespace AIChatBot.Services
{
    public class ConversationService : IConversationService
    {
        private readonly IRepository<Conversation> _conversationRepository;
        private readonly IRepository<Message> _messageRepository;
        private readonly IGroqService _groqService;
        private readonly ITavilyService _tavilyService;
        private readonly IWebSearchDecisionService _webSearchDecisionService;
        private readonly IRepository<MessageFeedback> _feedbackRepository;
        private readonly ILogger<ConversationService> _logger;

        public ConversationService(
            IRepository<Conversation> conversationRepository,
            IRepository<Message> messageRepository,
            IGroqService groqService,
            ITavilyService tavilyService,
            IWebSearchDecisionService webSearchDecisionService,
            IRepository<MessageFeedback> feedbackRepository,
            ILogger<ConversationService> logger)
        {
            _conversationRepository = conversationRepository;
            _messageRepository = messageRepository;
            _groqService = groqService;
            _tavilyService = tavilyService;
            _webSearchDecisionService = webSearchDecisionService;
            _feedbackRepository = feedbackRepository;
            _logger = logger;
        }

        public async Task<ConversationResponse> CreateConversationAsync(
            int userId, 
            string title, 
            CancellationToken cancellationToken = default)
        {
            var conversation = new Conversation
            {
                UserId = userId,
                Title = title,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _conversationRepository.AddAsync(conversation, cancellationToken);
            await _conversationRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Created new conversation ID: {Id} for user {UserId}", conversation.Id, userId);

            return new ConversationResponse
            {
                Id = conversation.Id,
                UserId = conversation.UserId,
                Title = conversation.Title,
                SelectedModel = conversation.SelectedModel,
                IsPinned = conversation.IsPinned,
                PinnedAt = conversation.PinnedAt,
                IsArchived = conversation.IsArchived,
                ArchivedAt = conversation.ArchivedAt,
                CreatedAt = conversation.CreatedAt,
                UpdatedAt = conversation.UpdatedAt
            };
        }

        public async Task<IEnumerable<ConversationResponse>> GetConversationsForUserAsync(
            int userId, 
            CancellationToken cancellationToken = default)
        {
            var list = await _conversationRepository.GetQueryable()
                .AsNoTracking()
                .Where(c => c.UserId == userId && !c.IsArchived)
                .OrderByDescending(c => c.IsPinned)
                .ThenByDescending(c => c.PinnedAt)
                .ThenByDescending(c => c.CreatedAt)
                .Select(c => new ConversationResponse
                {
                    Id = c.Id,
                    UserId = c.UserId,
                    Title = c.Title,
                    SelectedModel = c.SelectedModel,
                    IsPinned = c.IsPinned,
                    PinnedAt = c.PinnedAt,
                    IsArchived = c.IsArchived,
                    ArchivedAt = c.ArchivedAt,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                })
                .ToListAsync(cancellationToken);

            return list;
        }

        public async Task<ConversationDetailResponse> GetConversationDetailAsync(
            int userId, 
            int conversationId, 
            CancellationToken cancellationToken = default)
        {
            var conversation = await _conversationRepository.GetQueryable()
                .AsNoTracking()
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.Id == conversationId, cancellationToken);

            if (conversation == null)
            {
                throw new KeyNotFoundException($"Conversation with ID {conversationId} was not found.");
            }

            if (conversation.UserId != userId)
            {
                throw new UnauthorizedAccessException("You are not authorized to access this conversation.");
            }

            var messageIds = conversation.Messages.Select(m => m.Id).ToList();
            var feedbacks = await _feedbackRepository.GetQueryable()
                .AsNoTracking()
                .Where(f => f.UserId == userId && messageIds.Contains(f.MessageId))
                .ToDictionaryAsync(f => f.MessageId, f => f.FeedbackType, cancellationToken);

            var messages = conversation.Messages
                .OrderBy(m => m.CreatedAt)
                .Select(m => new MessageResponse
                {
                    Id = m.Id,
                    Role = m.Role,
                    Content = m.Content,
                    PromptTokens = m.PromptTokens,
                    CompletionTokens = m.CompletionTokens,
                    TotalTokens = m.TotalTokens,
                    Model = m.Model,
                    CreatedAt = m.CreatedAt,
                    FeedbackType = feedbacks.ContainsKey(m.Id) ? feedbacks[m.Id].ToString() : null
                })
                .ToList();

            return new ConversationDetailResponse
            {
                Id = conversation.Id,
                Title = conversation.Title,
                SelectedModel = conversation.SelectedModel,
                IsPinned = conversation.IsPinned,
                PinnedAt = conversation.PinnedAt,
                IsArchived = conversation.IsArchived,
                ArchivedAt = conversation.ArchivedAt,
                CreatedAt = conversation.CreatedAt,
                UpdatedAt = conversation.UpdatedAt,
                Messages = messages
            };
        }

        public async Task<bool> RenameConversationAsync(
            int userId, 
            int conversationId, 
            string newTitle, 
            CancellationToken cancellationToken = default)
        {
            var conversation = await _conversationRepository.GetByIdAsync(conversationId, cancellationToken);
            if (conversation == null)
            {
                throw new KeyNotFoundException($"Conversation with ID {conversationId} was not found.");
            }

            if (conversation.UserId != userId)
            {
                throw new UnauthorizedAccessException("You are not authorized to rename this conversation.");
            }

            conversation.Title = newTitle;
            conversation.UpdatedAt = DateTime.UtcNow;

            _conversationRepository.Update(conversation);
            return await _conversationRepository.SaveChangesAsync(cancellationToken);
        }

        public async Task<bool> DeleteConversationAsync(
            int userId, 
            int conversationId, 
            CancellationToken cancellationToken = default)
        {
            var conversation = await _conversationRepository.GetByIdAsync(conversationId, cancellationToken);
            if (conversation == null)
            {
                throw new KeyNotFoundException($"Conversation with ID {conversationId} was not found.");
            }

            if (conversation.UserId != userId)
            {
                throw new UnauthorizedAccessException("You are not authorized to delete this conversation.");
            }

            _conversationRepository.Delete(conversation);
            return await _conversationRepository.SaveChangesAsync(cancellationToken);
        }

        public async Task<bool> PinConversationAsync(
            int userId, 
            int conversationId, 
            bool isPinned, 
            CancellationToken cancellationToken = default)
        {
            var conversation = await _conversationRepository.GetByIdAsync(conversationId, cancellationToken);
            if (conversation == null)
            {
                throw new KeyNotFoundException($"Conversation with ID {conversationId} was not found.");
            }

            if (conversation.UserId != userId)
            {
                throw new UnauthorizedAccessException("You are not authorized to modify this conversation.");
            }

            if (isPinned)
            {
                var pinnedCount = await _conversationRepository.GetQueryable()
                    .CountAsync(c => c.UserId == userId && c.IsPinned, cancellationToken);

                if (pinnedCount >= 10)
                {
                    throw new InvalidOperationException("Maximum of 10 pinned conversations allowed.");
                }

                conversation.IsPinned = true;
                conversation.PinnedAt = DateTime.UtcNow;
            }
            else
            {
                conversation.IsPinned = false;
                conversation.PinnedAt = null;
            }

            _conversationRepository.Update(conversation);
            return await _conversationRepository.SaveChangesAsync(cancellationToken);
        }

        public async Task<IEnumerable<ConversationResponse>> SearchConversationsAsync(
            int userId, 
            string query, 
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return await GetConversationsForUserAsync(userId, cancellationToken);
            }

            var cleanQuery = query.Trim();

            var list = await _conversationRepository.GetQueryable()
                .AsNoTracking()
                .Where(c => c.UserId == userId && !c.IsArchived && 
                    (EF.Functions.Like(c.Title, $"%{cleanQuery}%") || 
                     c.Messages.Any(m => EF.Functions.Like(m.Content, $"%{cleanQuery}%"))))
                .OrderByDescending(c => c.IsPinned)
                .ThenByDescending(c => c.PinnedAt)
                .ThenByDescending(c => c.CreatedAt)
                .Select(c => new ConversationResponse
                {
                    Id = c.Id,
                    UserId = c.UserId,
                    Title = c.Title,
                    SelectedModel = c.SelectedModel,
                    IsPinned = c.IsPinned,
                    PinnedAt = c.PinnedAt,
                    IsArchived = c.IsArchived,
                    ArchivedAt = c.ArchivedAt,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                })
                .ToListAsync(cancellationToken);

            return list;
        }

        public async Task<IEnumerable<ConversationResponse>> GetArchivedConversationsForUserAsync(
            int userId, 
            CancellationToken cancellationToken = default)
        {
            var list = await _conversationRepository.GetQueryable()
                .AsNoTracking()
                .Where(c => c.UserId == userId && c.IsArchived)
                .OrderByDescending(c => c.ArchivedAt)
                .ThenByDescending(c => c.CreatedAt)
                .Select(c => new ConversationResponse
                {
                    Id = c.Id,
                    UserId = c.UserId,
                    Title = c.Title,
                    SelectedModel = c.SelectedModel,
                    IsPinned = c.IsPinned,
                    PinnedAt = c.PinnedAt,
                    IsArchived = c.IsArchived,
                    ArchivedAt = c.ArchivedAt,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                })
                .ToListAsync(cancellationToken);

            return list;
        }

        public async Task<bool> ArchiveConversationAsync(
            int userId, 
            int conversationId, 
            CancellationToken cancellationToken = default)
        {
            var conversation = await _conversationRepository.GetByIdAsync(conversationId, cancellationToken);
            if (conversation == null)
            {
                throw new KeyNotFoundException($"Conversation with ID {conversationId} was not found.");
            }

            if (conversation.UserId != userId)
            {
                throw new UnauthorizedAccessException("You are not authorized to modify this conversation.");
            }

            conversation.IsArchived = true;
            conversation.ArchivedAt = DateTime.UtcNow;
            conversation.IsPinned = false;
            conversation.PinnedAt = null;

            _conversationRepository.Update(conversation);
            return await _conversationRepository.SaveChangesAsync(cancellationToken);
        }

        public async Task<bool> RestoreConversationAsync(
            int userId, 
            int conversationId, 
            CancellationToken cancellationToken = default)
        {
            var conversation = await _conversationRepository.GetByIdAsync(conversationId, cancellationToken);
            if (conversation == null)
            {
                throw new KeyNotFoundException($"Conversation with ID {conversationId} was not found.");
            }

            if (conversation.UserId != userId)
            {
                throw new UnauthorizedAccessException("You are not authorized to modify this conversation.");
            }

            conversation.IsArchived = false;
            conversation.ArchivedAt = null;

            _conversationRepository.Update(conversation);
            return await _conversationRepository.SaveChangesAsync(cancellationToken);
        }

        public async Task<ChatResponse> ProcessSendMessageAsync(
            int userId, 
            int conversationId, 
            string content, 
            string model,
            Func<string, Task>? onStatusUpdate = null,
            Func<string, Task>? onChunkReceived = null,
            CancellationToken cancellationToken = default)
        {
            // 1. Verify Ownership & Load Conversation
            var conversation = await _conversationRepository.GetQueryable()
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.Id == conversationId, cancellationToken);

            if (conversation == null)
            {
                throw new KeyNotFoundException($"Conversation with ID {conversationId} was not found.");
            }

            if (conversation.UserId != userId)
            {
                throw new UnauthorizedAccessException("You are not authorized to send messages in this conversation.");
            }

            // Save selected model on conversation
            if (!string.IsNullOrWhiteSpace(model))
            {
                conversation.SelectedModel = model;
            }

            // 2. Save User Message immediately in Db
            var userMessage = new Message
            {
                ConversationId = conversationId,
                Role = "user",
                Content = content,
                CreatedAt = DateTime.UtcNow
            };
            await _messageRepository.AddAsync(userMessage, cancellationToken);
            conversation.UpdatedAt = DateTime.UtcNow;
            await _conversationRepository.SaveChangesAsync(cancellationToken);

            // 3. Decide if web search is needed
            bool requiresSearch = false;
            string searchReason = "";
            string finalModel = model;

            if (model == "nexa-web-search")
            {
                requiresSearch = true;
                searchReason = "Nexa Web Search model is selected.";
                finalModel = "llama-3.3-70b-versatile"; // Default fallback model for Nexa Search
            }
            else
            {
                if (onStatusUpdate != null)
                {
                    await onStatusUpdate("Analyzing query...");
                }
                var decision = await _webSearchDecisionService.DecideAsync(content, cancellationToken);
                requiresSearch = decision.RequiresSearch;
                searchReason = decision.Reason;
            }

            string searchResults = "";
            if (requiresSearch)
            {
                if (onStatusUpdate != null)
                {
                    await onStatusUpdate("Searching the web...");
                }
                searchResults = await _tavilyService.SearchAsync(content, cancellationToken);
            }

            // 4. Build Groq Chat History
            var chatHistory = new List<GroqMessage>();
            
            // Add system prompt if history is empty (or as first message)
            bool hasSystemMessage = conversation.Messages
                .Where(m => m.Id != userMessage.Id)
                .Any(m => m.Role.Equals("system", StringComparison.OrdinalIgnoreCase));
            if (!hasSystemMessage)
            {
                chatHistory.Add(new GroqMessage
                {
                    Role = "system",
                    Content = "You are Nexa AI assistant"
                });
            }

            // Map all existing messages ordered by creation (excluding the user message we just saved to avoid duplicates)
            foreach (var dbMsg in conversation.Messages.Where(m => m.Id != userMessage.Id).OrderBy(m => m.CreatedAt))
            {
                chatHistory.Add(new GroqMessage
                {
                    Role = dbMsg.Role,
                    Content = dbMsg.Content
                });
            }

            // Append retrieved web search info if needed
            if (requiresSearch && !string.IsNullOrWhiteSpace(searchResults))
            {
                chatHistory.Add(new GroqMessage
                {
                    Role = "system",
                    Content = $"The following web search information was retrieved for the query:\n{searchResults}\nAnswer the user using this updated information."
                });
            }

            // Append the new User message
            chatHistory.Add(new GroqMessage
            {
                Role = "user",
                Content = content
            });

            string assistantContent = "";
            int? promptTokens = null;
            int? completionTokens = null;
            int? totalTokens = null;
            string modelUsed = finalModel;

            // 5. Call Groq Service (Streaming vs Non-Streaming)
            if (onChunkReceived != null)
            {
                var sb = new System.Text.StringBuilder();
                await foreach (var responseChunk in _groqService.SendMessageStreamAsync(chatHistory, finalModel, cancellationToken))
                {
                    if (responseChunk.Choices != null && responseChunk.Choices.Count > 0)
                    {
                        var chunkText = responseChunk.Choices[0].Delta?.Content;
                        if (!string.IsNullOrEmpty(chunkText))
                        {
                            sb.Append(chunkText);
                            await onChunkReceived(chunkText);
                        }
                    }

                    if (responseChunk.Usage != null)
                    {
                        promptTokens = responseChunk.Usage.PromptTokens;
                        completionTokens = responseChunk.Usage.CompletionTokens;
                        totalTokens = responseChunk.Usage.TotalTokens;
                    }

                    if (!string.IsNullOrEmpty(responseChunk.Model))
                    {
                        modelUsed = responseChunk.Model;
                    }
                }
                assistantContent = sb.ToString();
            }
            else
            {
                var groqResponse = await _groqService.SendMessageAsync(chatHistory, finalModel, cancellationToken);
                assistantContent = groqResponse.Choices[0].Message.Content;
                promptTokens = groqResponse.Usage?.PromptTokens;
                completionTokens = groqResponse.Usage?.CompletionTokens;
                totalTokens = groqResponse.Usage?.TotalTokens;
                modelUsed = groqResponse.Model;
            }

            if (requiresSearch)
            {
                // Indicate search usage in the persisted model name
                modelUsed += " + Search";
            }

            // 6. Save Assistant Message in Db
            var assistantMessage = new Message
            {
                ConversationId = conversationId,
                Role = "assistant",
                Content = assistantContent,
                PromptTokens = promptTokens,
                CompletionTokens = completionTokens,
                TotalTokens = totalTokens,
                Model = modelUsed,
                CreatedAt = DateTime.UtcNow
            };

            conversation.UpdatedAt = DateTime.UtcNow;

            await _messageRepository.AddAsync(assistantMessage, cancellationToken);
            
            _conversationRepository.Update(conversation);
            await _conversationRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Message cycle complete. User msg ID: {UserMsgId}, Assistant msg ID: {AssistantMsgId}", 
                userMessage.Id, assistantMessage.Id);

            return new ChatResponse
            {
                Success = true,
                Message = assistantContent,
                Model = modelUsed,
                TotalTokens = totalTokens,
                Id = assistantMessage.Id
            };
        }
    }
}
