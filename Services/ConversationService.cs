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
        private readonly IOpenRouterService _openRouterService;
        private readonly ILogger<ConversationService> _logger;

        public ConversationService(
            IRepository<Conversation> conversationRepository,
            IRepository<Message> messageRepository,
            IOpenRouterService openRouterService,
            ILogger<ConversationService> logger)
        {
            _conversationRepository = conversationRepository;
            _messageRepository = messageRepository;
            _openRouterService = openRouterService;
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
                .Where(c => c.UserId == userId)
                .OrderByDescending(c => c.UpdatedAt)
                .Select(c => new ConversationResponse
                {
                    Id = c.Id,
                    UserId = c.UserId,
                    Title = c.Title,
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
                    CreatedAt = m.CreatedAt
                })
                .ToList();

            return new ConversationDetailResponse
            {
                Id = conversation.Id,
                Title = conversation.Title,
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

        public async Task<ChatResponse> ProcessSendMessageAsync(
            int userId, 
            int conversationId, 
            string content, 
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

            // 2. Build OpenRouter Chat History
            var chatHistory = new List<OpenRouterMessage>();
            
            // Add system prompt if history is empty (or as first message)
            bool hasSystemMessage = conversation.Messages.Any(m => m.Role.Equals("system", StringComparison.OrdinalIgnoreCase));
            if (!hasSystemMessage)
            {
                chatHistory.Add(new OpenRouterMessage
                {
                    Role = "system",
                    Content = "You are a helpful AI assistant."
                });
            }

            // Map all existing messages ordered by creation
            foreach (var dbMsg in conversation.Messages.OrderBy(m => m.CreatedAt))
            {
                chatHistory.Add(new OpenRouterMessage
                {
                    Role = dbMsg.Role,
                    Content = dbMsg.Content
                });
            }

            // Append the new User message
            chatHistory.Add(new OpenRouterMessage
            {
                Role = "user",
                Content = content
            });

            // 3. Call OpenRouter Service
            var openRouterResponse = await _openRouterService.SendMessageAsync(chatHistory, null, cancellationToken);

            // 4. Extract Response Content and Token Info
            var assistantContent = openRouterResponse.Choices[0].Message.Content;
            var promptTokens = openRouterResponse.Usage?.PromptTokens;
            var completionTokens = openRouterResponse.Usage?.CompletionTokens;
            var totalTokens = openRouterResponse.Usage?.TotalTokens;
            var modelUsed = openRouterResponse.Model;

            // 5. Save Messages in Db
            var userMessage = new Message
            {
                ConversationId = conversationId,
                Role = "user",
                Content = content,
                CreatedAt = DateTime.UtcNow
            };

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

            await _messageRepository.AddAsync(userMessage, cancellationToken);
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
                TotalTokens = totalTokens
            };
        }
    }
}
