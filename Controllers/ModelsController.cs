using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using AIChatBot.Models;

namespace AIChatBot.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/models")]
    public class ModelsController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public ModelsController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet]
        public IActionResult GetModels()
        {
            var models = _configuration.GetSection("AIModels").Get<List<AIModel>>() ?? new List<AIModel>();
            return Ok(models);
        }
    }
}
