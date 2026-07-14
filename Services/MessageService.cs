using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AIChatBot.Entities;
using AIChatBot.Models.Responses;
using AIChatBot.Repositories;

namespace AIChatBot.Services
{
    public class MessageService : IMessageService
    {
        private readonly IRepository<SavedMessage> _savedMessageRepository;
        private readonly IRepository<Message> _messageRepository;

        public MessageService(
            IRepository<SavedMessage> savedMessageRepository,
            IRepository<Message> messageRepository)
        {
            _savedMessageRepository = savedMessageRepository;
            _messageRepository = messageRepository;
        }

        public async Task<IEnumerable<SavedMessageResponse>> GetSavedMessagesForUserAsync(
            int userId, 
            CancellationToken cancellationToken = default)
        {
            return await _savedMessageRepository.GetQueryable()
                .AsNoTracking()
                .Include(sm => sm.Message)
                    .ThenInclude(m => m!.Conversation)
                .Where(sm => sm.UserId == userId)
                .OrderByDescending(sm => sm.CreatedAt)
                .Select(sm => new SavedMessageResponse
                {
                    Id = sm.Id,
                    MessageId = sm.MessageId,
                    ConversationId = sm.Message != null ? sm.Message.ConversationId : 0,
                    ConversationTitle = (sm.Message != null && sm.Message.Conversation != null) ? sm.Message.Conversation.Title : "Unknown",
                    Content = sm.Message != null ? sm.Message.Content : string.Empty,
                    CreatedAt = sm.CreatedAt
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<bool> SaveMessageAsync(
            int userId, 
            int messageId, 
            CancellationToken cancellationToken = default)
        {
            // 1. Check if the message exists and belongs to the user (via conversation)
            var message = await _messageRepository.GetQueryable()
                .Include(m => m.Conversation)
                .FirstOrDefaultAsync(m => m.Id == messageId, cancellationToken);

            if (message == null || message.Conversation == null || message.Conversation.UserId != userId)
            {
                return false; // Not authorized or message not found
            }

            // 2. Prevent duplicate saves
            var exists = await _savedMessageRepository.GetQueryable()
                .AnyAsync(sm => sm.UserId == userId && sm.MessageId == messageId, cancellationToken);

            if (exists)
            {
                return true; // Already saved
            }

            // 3. Save
            var savedMessage = new SavedMessage
            {
                UserId = userId,
                MessageId = messageId,
                CreatedAt = DateTime.UtcNow
            };

            await _savedMessageRepository.AddAsync(savedMessage, cancellationToken);
            return await _savedMessageRepository.SaveChangesAsync(cancellationToken);
        }

        public async Task<bool> UnsaveMessageAsync(
            int userId, 
            int messageId, 
            CancellationToken cancellationToken = default)
        {
            var savedMessage = await _savedMessageRepository.GetQueryable()
                .FirstOrDefaultAsync(sm => sm.UserId == userId && sm.MessageId == messageId, cancellationToken);

            if (savedMessage == null)
            {
                return false; // Not found
            }

            _savedMessageRepository.Delete(savedMessage);
            return await _savedMessageRepository.SaveChangesAsync(cancellationToken);
        }
    }
}
