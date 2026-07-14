using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using AIChatBot.Models.Responses;

namespace AIChatBot.Services
{
    public interface IMessageService
    {
        Task<IEnumerable<SavedMessageResponse>> GetSavedMessagesForUserAsync(
            int userId, 
            CancellationToken cancellationToken = default);

        Task<bool> SaveMessageAsync(
            int userId, 
            int messageId, 
            CancellationToken cancellationToken = default);

        Task<bool> UnsaveMessageAsync(
            int userId, 
            int messageId, 
            CancellationToken cancellationToken = default);
    }
}
