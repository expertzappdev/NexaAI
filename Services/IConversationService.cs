using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using AIChatBot.Models.Responses;

namespace AIChatBot.Services
{
    public interface IConversationService
    {
        Task<ConversationResponse> CreateConversationAsync(
            int userId, 
            string title, 
            CancellationToken cancellationToken = default);

        Task<IEnumerable<ConversationResponse>> GetConversationsForUserAsync(
            int userId, 
            CancellationToken cancellationToken = default);

        Task<ConversationDetailResponse> GetConversationDetailAsync(
            int userId, 
            int conversationId, 
            CancellationToken cancellationToken = default);

        Task<bool> RenameConversationAsync(
            int userId, 
            int conversationId, 
            string newTitle, 
            CancellationToken cancellationToken = default);

        Task<bool> DeleteConversationAsync(
            int userId, 
            int conversationId, 
            CancellationToken cancellationToken = default);

        Task<ChatResponse> ProcessSendMessageAsync(
            int userId, 
            int conversationId, 
            string content, 
            string model,
            System.Func<string, System.Threading.Tasks.Task>? onStatusUpdate = null,
            CancellationToken cancellationToken = default);
    }
}
