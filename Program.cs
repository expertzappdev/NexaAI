using System.Text;
using AIChatBot.Configurations;
using AIChatBot.Data;
using AIChatBot.Hubs;
using AIChatBot.Middleware;
using AIChatBot.Repositories;
using AIChatBot.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add configurations
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<GroqSettings>(builder.Configuration.GetSection("Groq"));
builder.Services.Configure<TavilySettings>(builder.Configuration.GetSection("Tavily"));

// Add database context
var connectionString = Environment.GetEnvironmentVariable("MYSQL_URL")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("Database connection string not found. Please configure the 'ConnectionStrings:DefaultConnection' setting, or set 'MYSQL_URL' / 'DATABASE_URL' environment variables.");
}

// Automatically parse mysql:// URI if provided (common on Render MySQL services)
if (connectionString.StartsWith("mysql://", StringComparison.OrdinalIgnoreCase))
{
    try
    {
        var uri = new Uri(connectionString);
        var userInfo = uri.UserInfo.Split(':');
        var username = userInfo[0];
        var password = userInfo.Length > 1 ? userInfo[1] : "";
        var host = uri.Host;
        var port = uri.Port > 0 ? uri.Port : 3306;
        var database = uri.AbsolutePath.TrimStart('/');
        
        connectionString = $"Server={host};Port={port};Database={database};Uid={username};Pwd={password};SslMode=Preferred;";
    }
    catch (Exception ex)
    {
        throw new InvalidOperationException("Failed to parse MySQL URI connection string: " + ex.Message, ex);
    }
}

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString));
});

// Register repositories and services
builder.Services.AddHttpClient();
builder.Services.AddHttpClient("GroqClient", (sp, client) =>
{
    var settings = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<GroqSettings>>().Value;
    client.BaseAddress = new Uri(settings.BaseUrl);
});
builder.Services.AddHttpClient("TavilyClient", (sp, client) =>
{
    var settings = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<TavilySettings>>().Value;
    client.BaseAddress = new Uri(settings.BaseUrl);
});
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IConversationService, ConversationService>();
builder.Services.AddScoped<IMessageService, MessageService>();
builder.Services.AddScoped<IGroqService, GroqService>();
builder.Services.AddScoped<ITavilyService, TavilyService>();
builder.Services.AddScoped<IWebSearchDecisionService, WebSearchDecisionService>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IPocketBaseAuthService, PocketBaseAuthService>();

// Configure Authentication & JWT Token Validation
var jwtSection = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtSection["Key"] ?? "SuperSecretKeyForJWTSecurityMakeItAtLeast32BytesLong!");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSection["Issuer"] ?? "AIChatBotBackend",
        ValidateAudience = true,
        ValidAudience = jwtSection["Audience"] ?? "AIChatBotClient",
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    // Integrate authentication for SignalR WebSockets and PocketBase token validation fallback
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/chatHub"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        },
        OnAuthenticationFailed = async context =>
        {
            try
            {
                var pbAuthService = context.HttpContext.RequestServices.GetRequiredService<IPocketBaseAuthService>();
                var token = context.Request.Headers["Authorization"].ToString().Replace("Bearer ", "").Trim();
                if (string.IsNullOrEmpty(token) && !string.IsNullOrEmpty(context.Request.Query["access_token"]))
                {
                    token = context.Request.Query["access_token"];
                }

                if (!string.IsNullOrEmpty(token) && await pbAuthService.ValidateTokenAsync(token))
                {
                    var userId = await pbAuthService.GetUserIdFromTokenAsync(token) ?? "1";
                    var claims = new[]
                    {
                        new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, userId),
                        new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, "PocketBase User"),
                    };
                    var identity = new System.Security.Claims.ClaimsIdentity(claims, JwtBearerDefaults.AuthenticationScheme);
                    context.Principal = new System.Security.Claims.ClaimsPrincipal(identity);
                    context.Success();
                }
            }
            catch
            {
                // PocketBase validation fallback error
            }
        }
    };
});

builder.Services.AddAuthorization();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.SetIsOriginAllowed(origin => true) // allows localhost, dynamic Vercel previews, etc.
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Add Controllers and SignalR
builder.Services.AddControllers();
builder.Services.AddSignalR();

// Swagger/OpenAPI configuration
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "AIChatBot API", Version = "v1" });
    
    var securityScheme = new OpenApiSecurityScheme
    {
        Name = "JWT Authentication",
        Description = "Enter JWT Bearer token **_only_**",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Reference = new OpenApiReference
        {
            Id = JwtBearerDefaults.AuthenticationScheme,
            Type = ReferenceType.SecurityScheme
        }
    };
    c.AddSecurityDefinition(securityScheme.Reference.Id, securityScheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { securityScheme, Array.Empty<string>() }
    });
});

var app = builder.Build();

// Automatically create database and tables asynchronously if they do not exist
_ = Task.Run(async () =>
{
    // Wait a brief moment to let the server start listening on port first
    await Task.Delay(1000);
    
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        var logger = services.GetRequiredService<ILogger<Program>>();
        try
        {
            var context = services.GetRequiredService<ApplicationDbContext>();
            var databaseCreator = context.Database.GetService<IDatabaseCreator>() as RelationalDatabaseCreator;
            
            if (databaseCreator != null)
            {
                if (!await databaseCreator.ExistsAsync())
                {
                    logger.LogInformation("Database does not exist. Creating database...");
                    await databaseCreator.CreateAsync();
                }

                if (!await databaseCreator.HasTablesAsync())
                {
                    logger.LogWarning("Missing database schema detected. Initializing schema...");
                    await databaseCreator.CreateTablesAsync();
                    logger.LogInformation("Database schema created successfully.");
                }
                else
                {
                    logger.LogInformation("Database and tables verified successfully.");
                }

                // Ensure UserMemories table exists
                await context.Database.ExecuteSqlRawAsync(@"
                    CREATE TABLE IF NOT EXISTS `UserMemories` (
                        `Id` INT AUTO_INCREMENT PRIMARY KEY,
                        `UserId` INT NOT NULL,
                        `Title` VARCHAR(255) NOT NULL,
                        `Content` TEXT NOT NULL,
                        `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                        `UpdatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                        CONSTRAINT `FK_UserMemories_Users_UserId` FOREIGN KEY (`UserId`) 
                            REFERENCES `Users` (`Id`) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
                ");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while ensuring the database schema was created in the background.");
        }
    }
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseHttpsRedirection();

app.UseCors("CorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/chatHub");

app.Run();
