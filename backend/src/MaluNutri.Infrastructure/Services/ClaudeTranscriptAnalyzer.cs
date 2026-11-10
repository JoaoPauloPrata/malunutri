using System.Text.Json;
using Anthropic;
using Anthropic.Exceptions;
using Anthropic.Models.Beta.Messages;
using MaluNutri.Application.Abstractions;
using MaluNutri.Application.Common;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MaluNutri.Infrastructure.Services;

public sealed class AiOptions
{
    public const string Section = "Ai";
    public string? AnthropicApiKey { get; set; }
    public string Model { get; set; } = "claude-opus-5-5";
}

/// <summary>Transcrição da consulta → campos do prontuário, via Claude com saída estruturada (JSON Schema).</summary>
internal sealed class ClaudeTranscriptAnalyzer(IOptions<AiOptions> options, ILogger<ClaudeTranscriptAnalyzer> log)
    : ITranscriptAnalyzer
{
    private const string SystemPrompt = """
        Você é assistente de uma nutricionista brasileira. Recebe a transcrição de uma consulta
        (falas da nutricionista e do paciente) e preenche o prontuário em português, de forma objetiva,
        em frases curtas no estilo de anotação clínica.

        - chief_complaint: queixa principal do paciente, com as palavras que ele usou.
        - routine: rotina alimentar e de horários (refeições puladas, delivery, trabalho, sono).
        - physical_activity: tipo, frequência e horário da atividade física.
        - objective: o que o paciente quer alcançar.

        Use só o que foi dito na transcrição. Se um campo não aparece, devolva string vazia — não invente.
        """;

    private static readonly Dictionary<string, JsonElement> Schema = new()
    {
        ["type"] = JsonSerializer.SerializeToElement("object"),
        ["properties"] = JsonSerializer.SerializeToElement(new
        {
            chief_complaint = new { type = "string" },
            routine = new { type = "string" },
            physical_activity = new { type = "string" },
            objective = new { type = "string" },
        }),
        ["required"] = JsonSerializer.SerializeToElement(new[] { "chief_complaint", "routine", "physical_activity", "objective" }),
        ["additionalProperties"] = JsonSerializer.SerializeToElement(false),
    };

    private AnthropicClient? _client;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(options.Value.AnthropicApiKey);

    public async Task<TranscriptSummary> AnalyzeAsync(string transcript, CancellationToken ct = default)
    {
        _client ??= new AnthropicClient { ApiKey = options.Value.AnthropicApiKey };

        BetaMessage response;
        try
        {
            response = await _client.Beta.Messages.Create(new MessageCreateParams
            {
                Model = options.Value.Model,
                MaxTokens = 4000,
                // Se o modelo recusar, o servidor tenta automaticamente outro modelo adequado.
                Betas = ["server-side-fallback-2026-07-01"],
                Fallbacks = new Default(),
                System = SystemPrompt,
                OutputConfig = new BetaOutputConfig
                {
                    Effort = Effort.Low, // extração simples
                    Format = new BetaJsonOutputFormat { Schema = Schema },
                },
                Messages = [new BetaUserMessageParam { Content = $"<transcricao>\n{transcript}\n</transcricao>" }],
            }, ct);
        }
        catch (AnthropicApiException ex)
        {
            log.LogError(ex, "Falha ao chamar a API do Claude");
            throw new ExternalServiceException("A IA não respondeu agora. Tente novamente em instantes.", ex);
        }

        if (response.StopReason == "refusal")
            throw new ExternalServiceException("A IA não conseguiu processar esta transcrição.");
        if (response.StopReason == "max_tokens")
            throw new ExternalServiceException("A resposta da IA veio incompleta. Tente novamente.");

        var json = string.Concat(response.Content.Select(b => b.Value).OfType<BetaTextBlock>().Select(t => t.Text));
        var data = JsonSerializer.Deserialize<Result>(json, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        }) ?? throw new ExternalServiceException("Resposta da IA em formato inesperado.");

        return new TranscriptSummary(data.ChiefComplaint, data.Routine, data.PhysicalActivity, data.Objective);
    }

    private sealed record Result(string? ChiefComplaint, string? Routine, string? PhysicalActivity, string? Objective);
}
