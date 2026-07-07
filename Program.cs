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
builder.Services.Configure<OpenRouterSettings>(builder.Configuration.GetSection("OpenRouter"));

// Add database context
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("MYSQL_URL")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL");

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
        
        connectionString = $"Server={host};Port={port};Database={database};Uid={username};Pwd={password};SSL Mode=None;";
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
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IConversationService, ConversationService>();
builder.Services.AddScoped<IOpenRouterService, OpenRouterService>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<ITokenService, TokenService>();

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

    // Integrate authentication for SignalR WebSockets (query string token extractor)
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
