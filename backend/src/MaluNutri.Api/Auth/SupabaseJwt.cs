using System.Security.Claims;
using System.Text;
using MaluNutri.Application.Abstractions;
using MaluNutri.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace MaluNutri.Api.Auth;

/// <summary>
/// Valida o access token emitido pelo Supabase Auth.
/// Projetos novos assinam com chaves assimétricas publicadas em /auth/v1/.well-known/jwks.json;
/// projetos antigos usam HS256 com o "JWT Secret" (Supabase:JwtSecret).
/// </summary>
public static class SupabaseJwt
{
    public static IServiceCollection AddSupabaseJwt(this IServiceCollection services, IConfiguration config)
    {
        var supa = config.GetSection(SupabaseOptions.Section).Get<SupabaseOptions>() ?? new();
        if (string.IsNullOrWhiteSpace(supa.Url))
            throw new InvalidOperationException("Supabase:Url não configurada.");
        var issuer = $"{supa.Url.TrimEnd('/')}/auth/v1";

        services.AddSingleton(new JwksCache($"{issuer}/.well-known/jwks.json"));
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<JwksCache>((o, jwks) =>
            {
                o.MapInboundClaims = false;
                o.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = issuer,
                    ValidAudience = "authenticated",
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = "sub",
                    IssuerSigningKeyResolver = (_, _, kid, _) =>
                    {
                        var keys = jwks.GetKeys(kid).ToList();
                        if (!string.IsNullOrWhiteSpace(supa.JwtSecret))
                            keys.Add(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(supa.JwtSecret)));
                        return keys;
                    },
                };
            });

        services.AddAuthorization();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, HttpCurrentUser>();
        return services;
    }
}

/// <summary>Cache das chaves públicas do Supabase (recarrega a cada 10 min ou quando aparece um kid novo).</summary>
public sealed class JwksCache(string url)
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(10) };
    private readonly Lock _lock = new();
    private JsonWebKeySet? _set;
    private DateTimeOffset _fetchedAt;

    public IEnumerable<SecurityKey> GetKeys(string? kid)
    {
        lock (_lock)
        {
            var stale = DateTimeOffset.UtcNow - _fetchedAt > TimeSpan.FromMinutes(10);
            var unknownKid = kid is not null && _set?.Keys.All(k => k.Kid != kid) == true
                             && DateTimeOffset.UtcNow - _fetchedAt > TimeSpan.FromSeconds(30);
            if (_set is null || stale || unknownKid)
            {
                try
                {
                    _set = new JsonWebKeySet(Http.GetStringAsync(url).GetAwaiter().GetResult());
                    _fetchedAt = DateTimeOffset.UtcNow;
                }
                catch when (_set is not null)
                {
                    // mantém as chaves anteriores se o Supabase estiver indisponível
                }
                catch
                {
                    return [];
                }
            }
            return _set.GetSigningKeys();
        }
    }
}

internal sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public Guid? UserId =>
        Guid.TryParse(accessor.HttpContext?.User.FindFirstValue("sub"), out var id) ? id : null;
}
