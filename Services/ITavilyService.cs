using System.Threading;
using System.Threading.Tasks;

namespace AIChatBot.Services
{
    public interface ITavilyService
    {
        Task<string> SearchAsync(string query, CancellationToken cancellationToken = default);
    }
}
