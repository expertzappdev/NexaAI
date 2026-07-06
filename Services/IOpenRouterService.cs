using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace AIChatBot.Services
{
    public interface IOpenRouterService
    {
        Task<OpenRouterResponse> SendMessageAsync(
            List<OpenRouterMessage> chatHistory, 
            string? modelOverride = null, 
            CancellationToken cancellationToken = default);
    }
}
