using System.Threading.Tasks;

namespace AIChatBot.Services
{
    public interface IPocketBaseAuthService
    {
        /// <summary>
        /// Validates a PocketBase auth token by querying the PocketBase auth refresh endpoint.
        /// </summary>
        /// <param name="token">PocketBase JWT bearer token</param>
        /// <returns>True if token is valid, false otherwise</returns>
        Task<bool> ValidateTokenAsync(string token);

        /// <summary>
        /// Gets the PocketBase user ID associated with the token.
        /// </summary>
        Task<string?> GetUserIdFromTokenAsync(string token);
    }
}
