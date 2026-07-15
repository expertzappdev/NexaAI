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
        private readonly IRepository<UserMemory> _userMemoryRepository;
        private readonly ILogger<ConversationService> _logger;

        public ConversationService(
            IRepository<Conversation> conversationRepository,
            IRepository<Message> messageRepository,
            IGroqService groqService,
            ITavilyService tavilyService,
            IWebSearchDecisionService webSearchDecisionService,
            IRepository<MessageFeedback> feedbackRepository,
            IRepository<UserMemory> userMemoryRepository,
            ILogger<ConversationService> logger)
        {
            _conversationRepository = conversationRepository;
            _messageRepository = messageRepository;
            _groqService = groqService;
            _tavilyService = tavilyService;
            _webSearchDecisionService = webSearchDecisionService;
            _feedbackRepository = feedbackRepository;
            _userMemoryRepository = userMemoryRepository;
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


            // 3. Build Groq Chat History
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

            // Map all existing messages ordered by creation (excluding the user message we just saved to DB, to avoid duplicate rendering)
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

            // Inject User memories dynamically into System Prompt
            await InjectUserMemoriesAsync(userId, chatHistory, cancellationToken);

            // 4. Call Groq Service
            string assistantContent = "";
            int? promptTokens = 0;
            int? completionTokens = 0;
            int? totalTokens = 0;
            bool isStopped = false;
            var modelUsed = finalModel;

            var partialContent = new System.Text.StringBuilder();
            Action<string> chunkHandler = (chunk) =>
            {
                partialContent.Append(chunk);
                if (onChunkReceived != null)
                {
                    onChunkReceived(chunk).GetAwaiter().GetResult();
                }
            };

            try
            {
                var groqResponse = await _groqService.SendMessageAsync(
                    chatHistory, 
                    finalModel, 
                    chunkHandler, 
                    cancellationToken);

                assistantContent = groqResponse.Choices[0].Message.Content;
                promptTokens = groqResponse.Usage?.PromptTokens;
                completionTokens = groqResponse.Usage?.CompletionTokens;
                totalTokens = groqResponse.Usage?.TotalTokens;
                modelUsed = groqResponse.Model;
            }
            catch (OperationCanceledException)
            {
                isStopped = true;
                _logger.LogWarning("Groq API call was cancelled.");
                assistantContent = partialContent.ToString();
            }

            if (requiresSearch)
            {
                modelUsed += " + Search";
            }

            // 5. Save assistant response in Db
            var assistantMessage = new Message
            {
                ConversationId = conversationId,
                Role = "assistant",
                Content = assistantContent,
                PromptTokens = promptTokens,
                CompletionTokens = completionTokens,
                TotalTokens = totalTokens,
                Model = modelUsed,
                IsStopped = isStopped,
                CreatedAt = DateTime.UtcNow
            };

            conversation.UpdatedAt = DateTime.UtcNow;

            await _messageRepository.AddAsync(assistantMessage, cancellationToken);
            _conversationRepository.Update(conversation);
            await _conversationRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Message cycle complete. User msg ID: {UserMsgId}, Assistant msg ID: {AssistantMsgId}, Stopped: {Stopped}", 
                userMessage.Id, assistantMessage.Id, isStopped);

            return new ChatResponse
            {
                Success = true,
                Message = assistantContent,
                Model = modelUsed,
                TotalTokens = totalTokens,
                IsStopped = isStopped,
                MessageId = assistantMessage.Id
            };
        }

        public async Task<ChatResponse> RegenerateResponseAsync(
            int userId,
            int messageId,
            string currentModel,
            Func<string, Task>? onStatusUpdate = null,
            Func<string, Task>? onChunkReceived = null,
            CancellationToken cancellationToken = default)
        {
            // 1. Fetch assistant message
            var assistantMsg = await _messageRepository.GetQueryable()
                .Include(m => m.Conversation)
                .ThenInclude(c => c.Messages!)
                .FirstOrDefaultAsync(m => m.Id == messageId, cancellationToken);

            if (assistantMsg == null || assistantMsg.Conversation == null)
            {
                throw new KeyNotFoundException($"Message with ID {messageId} was not found or has no conversation.");
            }

            if (assistantMsg.Role != "assistant")
            {
                throw new InvalidOperationException("Only assistant messages can be regenerated.");
            }

            var conversation = assistantMsg.Conversation;
            if (conversation.UserId != userId)
            {
                throw new UnauthorizedAccessException("You are not authorized to regenerate messages in this conversation.");
            }

            // 2. Identify prompt and history up to this message
            var orderedMessages = conversation.Messages.OrderBy(m => m.CreatedAt).ToList();
            var targetIndex = orderedMessages.FindIndex(m => m.Id == messageId);
            if (targetIndex <= 0)
            {
                throw new InvalidOperationException("Could not find the prompt preceding this assistant message.");
            }

            var userPromptMsg = orderedMessages[targetIndex - 1];
            if (userPromptMsg.Role != "user")
            {
                throw new InvalidOperationException("The message preceding the assistant response is not a user prompt.");
            }

            var historyMessages = orderedMessages.Take(targetIndex - 1).ToList();

            // 3. Web Search Preservation Logic
            bool requiresSearch = false;
            string searchReason = "";
            string finalModel = currentModel;

            // Check if current model is web search or if the message previously used web search
            bool previouslyUsedSearch = assistantMsg.Model != null && 
                (assistantMsg.Model.Contains("Search", StringComparison.OrdinalIgnoreCase));

            if (currentModel == "nexa-web-search" || previouslyUsedSearch)
            {
                requiresSearch = true;
                searchReason = "Web search was selected or previously used for this response.";
                if (currentModel == "nexa-web-search")
                {
                    finalModel = "llama-3.3-70b-versatile";
                }
            }
            else
            {
                // Otherwise check decision service on prompt
                if (onStatusUpdate != null)
                {
                    await onStatusUpdate("Analyzing query...");
                }
                var decision = await _webSearchDecisionService.DecideAsync(userPromptMsg.Content, cancellationToken);
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
                searchResults = await _tavilyService.SearchAsync(userPromptMsg.Content, cancellationToken);
            }

            // 4. Build Chat History
            var chatHistory = new List<GroqMessage>();

            // Add system prompt if not present
            bool hasSystemMessage = historyMessages.Any(m => m.Role.Equals("system", StringComparison.OrdinalIgnoreCase));
            if (!hasSystemMessage)
            {
                chatHistory.Add(new GroqMessage
                {
                    Role = "system",
                    Content = "You are Nexa AI assistant"
                });
            }

            // Map history messages
            foreach (var dbMsg in historyMessages)
            {
                chatHistory.Add(new GroqMessage
                {
                    Role = dbMsg.Role,
                    Content = dbMsg.Content
                });
            }

            // Append search results if needed
            if (requiresSearch && !string.IsNullOrWhiteSpace(searchResults))
            {
                chatHistory.Add(new GroqMessage
                {
                    Role = "system",
                    Content = $"The following web search information was retrieved for the query:\n{searchResults}\nAnswer the user using this updated information."
                });
            }

            // Append target user prompt
            chatHistory.Add(new GroqMessage
            {
                Role = "user",
                Content = userPromptMsg.Content
            });

            // Inject User memories dynamically into System Prompt
            await InjectUserMemoriesAsync(userId, chatHistory, cancellationToken);

            // 5. Call Groq
            string assistantContent = "";
            int? promptTokens = 0;
            int? completionTokens = 0;
            int? totalTokens = 0;
            bool isStopped = false;
            var modelUsed = finalModel;

            var partialContent = new System.Text.StringBuilder();
            Action<string> chunkHandler = (chunk) =>
            {
                partialContent.Append(chunk);
                if (onChunkReceived != null)
                {
                    onChunkReceived(chunk).GetAwaiter().GetResult();
                }
            };

            try
            {
                var groqResponse = await _groqService.SendMessageAsync(
                    chatHistory, 
                    finalModel, 
                    chunkHandler, 
                    cancellationToken);

                assistantContent = groqResponse.Choices[0].Message.Content;
                promptTokens = groqResponse.Usage?.PromptTokens;
                completionTokens = groqResponse.Usage?.CompletionTokens;
                totalTokens = groqResponse.Usage?.TotalTokens;
                modelUsed = groqResponse.Model;
            }
            catch (OperationCanceledException)
            {
                isStopped = true;
                _logger.LogWarning("Groq API call was cancelled during response regeneration.");
                assistantContent = partialContent.ToString();
            }

            if (requiresSearch)
            {
                modelUsed += " + Search";
            }

            // 7. Update database record to replace old response
            assistantMsg.Content = assistantContent;
            assistantMsg.PromptTokens = promptTokens;
            assistantMsg.CompletionTokens = completionTokens;
            assistantMsg.TotalTokens = totalTokens;
            assistantMsg.Model = modelUsed;
            assistantMsg.IsStopped = isStopped;

            _messageRepository.Update(assistantMsg);
            
            conversation.UpdatedAt = DateTime.UtcNow;
            _conversationRepository.Update(conversation);

            await _conversationRepository.SaveChangesAsync(cancellationToken);

            return new ChatResponse
            {
                Success = true,
                Message = assistantContent,
                Model = modelUsed,
                TotalTokens = totalTokens,
                IsStopped = isStopped,
                MessageId = assistantMsg.Id
            };
        }

        public async Task<ChatResponse> EditMessageAsync(
            int userId,
            int messageId,
            string newContent,
            string currentModel,
            Func<string, Task>? onStatusUpdate = null,
            Func<string, Task>? onChunkReceived = null,
            CancellationToken cancellationToken = default)
        {
            // 1. Fetch user message and verify ownership
            var userMessage = await _messageRepository.GetQueryable()
                .Include(m => m.Conversation)
                .ThenInclude(c => c.Messages!)
                .FirstOrDefaultAsync(m => m.Id == messageId, cancellationToken);

            if (userMessage == null || userMessage.Conversation == null)
            {
                throw new KeyNotFoundException($"Message with ID {messageId} was not found or has no conversation.");
            }

            if (userMessage.Role != "user")
            {
                throw new InvalidOperationException("Only user messages can be edited.");
            }

            var conversation = userMessage.Conversation;
            if (conversation.UserId != userId)
            {
                throw new UnauthorizedAccessException("You are not authorized to edit messages in this conversation.");
            }

            // Save selected model on conversation
            if (!string.IsNullOrWhiteSpace(currentModel))
            {
                conversation.SelectedModel = currentModel;
            }

            // 2. Truncate conversation history: Delete all messages after this user message
            var messagesToDelete = conversation.Messages
                .Where(m => m.CreatedAt > userMessage.CreatedAt)
                .ToList();

            foreach (var msg in messagesToDelete)
            {
                _messageRepository.Delete(msg);
            }

            // Remove deleted messages from the in-memory collection too
            foreach (var msg in messagesToDelete)
            {
                conversation.Messages.Remove(msg);
            }

            // 3. Update the user message content and save early
            userMessage.Content = newContent;
            userMessage.IsEdited = true;
            userMessage.EditedAt = DateTime.UtcNow;
            _messageRepository.Update(userMessage);
            await _conversationRepository.SaveChangesAsync(cancellationToken);

            // 4. Web Search / Tavily logic
            bool requiresSearch = false;
            string searchReason = "";
            string finalModel = currentModel;

            if (currentModel == "nexa-web-search")
            {
                requiresSearch = true;
                searchReason = "Nexa Web Search model is selected.";
                finalModel = "llama-3.3-70b-versatile";
            }
            else
            {
                if (onStatusUpdate != null)
                {
                    await onStatusUpdate("Analyzing query...");
                }
                var decision = await _webSearchDecisionService.DecideAsync(newContent, cancellationToken);
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
                searchResults = await _tavilyService.SearchAsync(newContent, cancellationToken);
            }

            // 5. Build prompt history from remaining messages (ordered by creation)
            var remainingMessages = conversation.Messages.OrderBy(m => m.CreatedAt).ToList();
            var chatHistory = new List<GroqMessage>();

            // Add system prompt if not present
            bool hasSystemMessage = remainingMessages.Any(m => m.Role.Equals("system", StringComparison.OrdinalIgnoreCase));
            if (!hasSystemMessage)
            {
                chatHistory.Add(new GroqMessage
                {
                    Role = "system",
                    Content = "You are Nexa AI assistant"
                });
            }

            // Map all history messages except the user message itself
            foreach (var dbMsg in remainingMessages.Where(m => m.Id != userMessage.Id))
            {
                chatHistory.Add(new GroqMessage
                {
                    Role = dbMsg.Role,
                    Content = dbMsg.Content
                });
            }

            // Append retrieved search results if needed
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
                Content = newContent
            });

            // Inject User memories dynamically into System Prompt
            await InjectUserMemoriesAsync(userId, chatHistory, cancellationToken);

            // 6. Call Groq Service
            string assistantContent = "";
            int? promptTokens = 0;
            int? completionTokens = 0;
            int? totalTokens = 0;
            bool isStopped = false;
            var modelUsed = finalModel;

            var partialContent = new System.Text.StringBuilder();
            Action<string> chunkHandler = (chunk) =>
            {
                partialContent.Append(chunk);
                if (onChunkReceived != null)
                {
                    onChunkReceived(chunk).GetAwaiter().GetResult();
                }
            };

            try
            {
                var groqResponse = await _groqService.SendMessageAsync(
                    chatHistory, 
                    finalModel, 
                    chunkHandler, 
                    cancellationToken);

                assistantContent = groqResponse.Choices[0].Message.Content;
                promptTokens = groqResponse.Usage?.PromptTokens;
                completionTokens = groqResponse.Usage?.CompletionTokens;
                totalTokens = groqResponse.Usage?.TotalTokens;
                modelUsed = groqResponse.Model;
            }
            catch (OperationCanceledException)
            {
                isStopped = true;
                _logger.LogWarning("Groq API call was cancelled during message editing.");
                assistantContent = partialContent.ToString();
            }

            if (requiresSearch)
            {
                modelUsed += " + Search";
            }

            // 7. Save the new Assistant response in Db
            var assistantMessage = new Message
            {
                ConversationId = conversation.Id,
                Role = "assistant",
                Content = assistantContent,
                PromptTokens = promptTokens,
                CompletionTokens = completionTokens,
                TotalTokens = totalTokens,
                Model = modelUsed,
                IsStopped = isStopped,
                CreatedAt = DateTime.UtcNow
            };

            conversation.UpdatedAt = DateTime.UtcNow;

            await _messageRepository.AddAsync(assistantMessage, cancellationToken);
            _conversationRepository.Update(conversation);
            await _conversationRepository.SaveChangesAsync(cancellationToken);

            return new ChatResponse
            {
                Success = true,
                Message = assistantContent,
                Model = modelUsed,
                TotalTokens = totalTokens,
                IsStopped = isStopped,
                MessageId = assistantMessage.Id
            };
        }

        private async Task InjectUserMemoriesAsync(int userId, List<GroqMessage> chatHistory, CancellationToken cancellationToken)
        {
            var memories = await _userMemoryRepository.GetQueryable()
                .Where(m => m.UserId == userId)
                .ToListAsync(cancellationToken);

            if (memories.Count > 0)
            {
                var memoryPrompt = new System.Text.StringBuilder();
                memoryPrompt.AppendLine("You have the following long-term memory about the user preference(s):");
                foreach (var mem in memories)
                {
                    memoryPrompt.AppendLine($"- {mem.Title}: {mem.Content}");
                }
                memoryPrompt.AppendLine("\nBased on these preferences, adapt your responses appropriately.");
                memoryPrompt.AppendLine("Additionally, you MUST write down what user preference(s) you remembered in a separate section at the end of your response under a header named \"### What I Remembered:\". Example:\n### What I Remembered:\n- Preference details...");

                var systemMessage = chatHistory.FirstOrDefault(m => m.Role.Equals("system", StringComparison.OrdinalIgnoreCase));
                if (systemMessage != null)
                {
                    systemMessage.Content = systemMessage.Content + "\n\n" + memoryPrompt.ToString();
                }
                else
                {
                    chatHistory.Insert(0, new GroqMessage
                    {
                        Role = "system",
                        Content = "You are Nexa AI assistant\n\n" + memoryPrompt.ToString()
                    });
                }
            }
        }

        public async Task<ChatResponse> ProcessTemporaryMessageAsync(
            List<GroqMessage> chatHistory,
            string model,
            System.Func<string, System.Threading.Tasks.Task>? onStatusUpdate = null,
            System.Func<string, System.Threading.Tasks.Task>? onChunkReceived = null,
            CancellationToken cancellationToken = default)
        {
            // 1. Model Validation & fallback
            var finalModel = model;
            if (finalModel == "nexa-web-search")
            {
                finalModel = "llama-3.3-70b-versatile";
            }

            // 2. Identify if web search is needed
            bool requiresSearch = model == "nexa-web-search";
            var lastUserMessage = chatHistory.LastOrDefault(m => m.Role == "user")?.Content ?? "";

            if (model != "nexa-web-search")
            {
                if (onStatusUpdate != null)
                {
                    await onStatusUpdate("Analyzing query...");
                }
                var decision = await _webSearchDecisionService.DecideAsync(lastUserMessage, cancellationToken);
                requiresSearch = decision.RequiresSearch;
            }

            string searchResults = "";
            if (requiresSearch)
            {
                if (onStatusUpdate != null)
                {
                    await onStatusUpdate("Searching the web...");
                }
                searchResults = await _tavilyService.SearchAsync(lastUserMessage, cancellationToken);
            }

            // 3. Make a copy of chat history to manipulate for Groq
            var groqHistory = new List<GroqMessage>();

            // Add system prompt if not present
            bool hasSystemMessage = chatHistory.Any(m => m.Role.Equals("system", StringComparison.OrdinalIgnoreCase));
            if (!hasSystemMessage)
            {
                groqHistory.Add(new GroqMessage
                {
                    Role = "system",
                    Content = "You are Nexa AI assistant"
                });
            }

            // Add the history passed from client
            groqHistory.AddRange(chatHistory);

            // Append retrieved search results if needed
            if (requiresSearch && !string.IsNullOrWhiteSpace(searchResults))
            {
                // Inject search results right before the last user message
                var lastMsg = groqHistory.LastOrDefault(m => m.Role == "user");
                if (lastMsg != null)
                {
                    int lastIdx = groqHistory.LastIndexOf(lastMsg);
                    groqHistory.Insert(lastIdx, new GroqMessage
                    {
                        Role = "system",
                        Content = $"The following web search information was retrieved for the query:\n{searchResults}\nAnswer the user using this updated information."
                    });
                }
                else
                {
                    groqHistory.Add(new GroqMessage
                    {
                        Role = "system",
                        Content = $"The following web search information was retrieved for the query:\n{searchResults}\nAnswer the user using this updated information."
                    });
                }
            }

            // 4. Call Groq Service
            string assistantContent = "";
            int? promptTokens = 0;
            int? completionTokens = 0;
            int? totalTokens = 0;
            bool isStopped = false;
            var modelUsed = finalModel;

            var partialContent = new System.Text.StringBuilder();
            Action<string> chunkHandler = (chunk) =>
            {
                partialContent.Append(chunk);
                if (onChunkReceived != null)
                {
                    onChunkReceived(chunk).GetAwaiter().GetResult();
                }
            };

            try
            {
                var groqResponse = await _groqService.SendMessageAsync(
                    groqHistory,
                    finalModel,
                    chunkHandler,
                    cancellationToken);

                assistantContent = groqResponse.Choices[0].Message.Content;
                promptTokens = groqResponse.Usage?.PromptTokens;
                completionTokens = groqResponse.Usage?.CompletionTokens;
                totalTokens = groqResponse.Usage?.TotalTokens;
                modelUsed = groqResponse.Model;
            }
            catch (OperationCanceledException)
            {
                isStopped = true;
                _logger.LogWarning("Groq API call was cancelled.");
                assistantContent = partialContent.ToString();
            }

            if (requiresSearch)
            {
                modelUsed += " + Search";
            }

            return new ChatResponse
            {
                Success = true,
                Message = assistantContent,
                Model = modelUsed,
                TotalTokens = totalTokens ?? 0,
                IsStopped = isStopped,
                MessageId = 0 // Temporary chat doesn't save to DB
            };
        }
    }
}
