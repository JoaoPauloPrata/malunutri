using System.Net;
using System.Net.Http.Json;
using MaluNutri.Application.Abstractions;
using MaluNutri.Application.Common;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MaluNutri.Infrastructure.Services;

public sealed class SupabaseOptions
{
    public const string Section = "Supabase";
    /// <summary>https://&lt;ref&gt;.supabase.co</summary>
    public string Url { get; set; } = "";
    /// <summary>Chave secreta (service_role / sb_secret_...). Só no servidor.</summary>
    public string ServiceRoleKey { get; set; } = "";
    /// <summary>Legado: segredo HS256 do JWT. Projetos novos usam chaves assimétricas (JWKS).</summary>
    public string? JwtSecret { get; set; }
    /// <summary>Para onde o link do convite redireciona (tela de definir senha do PWA).</summary>
    public string InviteRedirectUrl { get; set; } = "";
}

/// <summary>Convite de paciente via Admin API do Supabase Auth (GoTrue).</summary>
internal sealed class SupabaseAuthAdmin(HttpClient http, IOptions<SupabaseOptions> options, ILogger<SupabaseAuthAdmin> log)
    : IAuthAdmin
{
    public async Task InviteAsync(string email, string fullName, CancellationToken ct = default)
    {
        var o = options.Value;
        if (string.IsNullOrWhiteSpace(o.Url) || string.IsNullOrWhiteSpace(o.ServiceRoleKey))
            throw new ExternalServiceException("Supabase não configurado no servidor (Supabase:Url / Supabase:ServiceRoleKey).");

        var url = $"{o.Url.TrimEnd('/')}/auth/v1/invite";
        if (!string.IsNullOrWhiteSpace(o.InviteRedirectUrl))
            url += "?redirect_to=" + Uri.EscapeDataString(o.InviteRedirectUrl);

        using var req = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(new { email, data = new { full_name = fullName } }),
        };
        req.Headers.Add("apikey", o.ServiceRoleKey);
        req.Headers.Authorization = new("Bearer", o.ServiceRoleKey);

        using var res = await http.SendAsync(req, ct);
        if (res.IsSuccessStatusCode) return;

        var body = await res.Content.ReadAsStringAsync(ct);
        log.LogWarning("Falha no convite Supabase ({Status}): {Body}", (int)res.StatusCode, body);
        throw res.StatusCode switch
        {
            HttpStatusCode.UnprocessableEntity or HttpStatusCode.Conflict =>
                new ConflictException("Este e-mail já tem uma conta. Peça para o paciente entrar com ele ou recuperar a senha."),
            HttpStatusCode.TooManyRequests =>
                new ExternalServiceException("Limite de e-mails do Supabase atingido. Tente novamente mais tarde."),
            _ => new ExternalServiceException("Não foi possível enviar o convite agora."),
        };
    }
}
