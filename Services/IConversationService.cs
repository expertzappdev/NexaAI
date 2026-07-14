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

        Task<bool> PinConversationAsync(
            int userId, 
            int conversationId, 
            bool isPinned, 
            CancellationToken cancellationToken = default);

        Task<IEnumerable<ConversationResponse>> SearchConversationsAsync(
            int userId, 
            string query, 
            CancellationToken cancellationToken = default);

        Task<IEnumerable<ConversationResponse>> GetArchivedConversationsForUserAsync(
            int userId, 
            CancellationToken cancellationToken = default);

        Task<bool> ArchiveConversationAsync(
            int userId, 
            int conversationId, 
            CancellationToken cancellationToken = default);

        Task<bool> RestoreConversationAsync(
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

        Task<ChatResponse> RegenerateResponseAsync(
            int userId,
            int messageId,
            string currentModel,
            System.Func<string, System.Threading.Tasks.Task>? onStatusUpdate = null,
            CancellationToken cancellationToken = default);
    }
}
