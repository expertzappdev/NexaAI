using System.Threading;
using System.Threading.Tasks;

namespace AIChatBot.Services
{
    public class WebSearchDecision
    {
        public bool RequiresSearch { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public interface IWebSearchDecisionService
    {
        Task<WebSearchDecision> DecideAsync(string prompt, CancellationToken cancellationToken = default);
    }
}
