using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace AIChatBot.Services
{
    public class WebSearchDecisionService : IWebSearchDecisionService
    {
        private readonly IGroqService _groqService;
        private readonly ILogger<WebSearchDecisionService> _logger;

        public WebSearchDecisionService(IGroqService groqService, ILogger<WebSearchDecisionService> logger)
        {
            _groqService = groqService;
            _logger = logger;
        }

        public async Task<WebSearchDecision> DecideAsync(string prompt, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(prompt))
            {
                return new WebSearchDecision { RequiresSearch = false, Reason = "Empty query." };
            }

            // 1. Local keyword-based heuristic check
            bool hasSearchKeywords = false;
            string matchedKeyword = "";
            var searchKeywords = new[] { "weather", "news", "stock price", "latest", "today", "yesterday", "current status", "search the web", "search for", "who is the current", "price of", "crypto price" };
            string lowerPrompt = prompt.ToLowerInvariant();
            foreach (var kw in searchKeywords)
            {
                if (lowerPrompt.Contains(kw))
                {
                    hasSearchKeywords = true;
                    matchedKeyword = kw;
                    break;
                }
            }

            var systemMessage = new GroqMessage
            {
                Role = "system",
                Content = "You are a web search decision assistant. You must analyze the user query and determine if it requires real-time information or live web search (e.g. current events, today's news, stock/crypto prices, weather, recent technology updates, version information, or today's data).\n\nReturn ONLY a valid JSON object matching the schema below without any code blocks or explanation:\n{\n  \"requiresSearch\": true/false,\n  \"reason\": \"a brief explanation\"\n}"
            };

            var userMessage = new GroqMessage
            {
                Role = "user",
                Content = $"User Query: \"{prompt}\""
            };

            var messages = new List<GroqMessage> { systemMessage, userMessage };

            try
            {
                // Call Groq using a fast model (e.g. llama-3.1-8b-instant)
                var groqResponse = await _groqService.SendMessageAsync(messages, "llama-3.1-8b-instant", cancellationToken);
                var content = groqResponse.Choices[0].Message.Content.Trim();

                _logger.LogInformation("WebSearchDecision response content: {Content}", content);

                // Extract JSON if wrapped in markdown code blocks
                var jsonMatch = Regex.Match(content, @"\{[\s\S]*\}");
                if (jsonMatch.Success)
                {
                    content = jsonMatch.Value;
                }

                WebSearchDecision? decision = null;
                try
                {
                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    decision = JsonSerializer.Deserialize<WebSearchDecision>(content, options);
                }
                catch (JsonException)
                {
                    // Defensive parsing fallback: Check if the raw string contains requiresSearch: true/string-true
                    bool requiresSearch = content.Contains("\"requiresSearch\": true", StringComparison.OrdinalIgnoreCase) || 
                                          content.Contains("\"requiresSearch\": \"true\"", StringComparison.OrdinalIgnoreCase);
                    
                    var reasonMatch = Regex.Match(content, @"\""reason\""\s*:\s*\""([^\""]+)\""");
                    string reason = reasonMatch.Success ? reasonMatch.Groups[1].Value : "Regex fallback parsing.";

                    decision = new WebSearchDecision
                    {
                        RequiresSearch = requiresSearch,
                        Reason = reason
                    };
                }

                if (decision != null)
                {
                    // If the LLM returned false but local keywords matched, force search to true
                    if (!decision.RequiresSearch && hasSearchKeywords)
                    {
                        decision.RequiresSearch = true;
                        decision.Reason = $"Forced search due to local keyword match: '{matchedKeyword}' (LLM reason: {decision.Reason})";
                    }
                    return decision;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to determine if web search is required for query: {Query}", prompt);
            }

            // Fallback: If LLM fails but keywords matched, search anyway
            if (hasSearchKeywords)
            {
                return new WebSearchDecision
                {
                    RequiresSearch = true,
                    Reason = $"Fallback to search due to local keyword match: '{matchedKeyword}'"
                };
            }

            // Fallback: Default to false
            return new WebSearchDecision
            {
                RequiresSearch = false,
                Reason = "Error or fallback to normal generation."
            };
        }
    }
}
