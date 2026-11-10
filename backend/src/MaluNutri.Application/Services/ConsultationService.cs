using MaluNutri.Application.Abstractions;
using MaluNutri.Application.Common;
using MaluNutri.Application.Dtos;
using MaluNutri.Domain.Consultations;

namespace MaluNutri.Application.Services;

public sealed class ConsultationService(
    AccessService access, IConsultationRepository consultations, ITranscriptAnalyzer analyzer,
    IClock clock, IUnitOfWork uow)
{
    public async Task<IReadOnlyList<ConsultationDto>> ListAsync(Guid patientId, CancellationToken ct)
    {
        await access.RequireOwnedPatientAsync(patientId, ct);
        return (await consultations.ListByPatientAsync(patientId, ct)).Select(c => c.ToDto()).ToList();
    }

    public async Task<ConsultationDto> GetAsync(Guid id, CancellationToken ct) => (await LoadAsync(id, ct)).ToDto();

    public async Task<ConsultationDto> ScheduleAsync(Guid patientId, ScheduleConsultationInput input, CancellationToken ct)
    {
        await access.RequireOwnedPatientAsync(patientId, ct);
        var c = Consultation.Schedule(patientId, input.ScheduledAt, input.DurationMin, input.Kind);
        consultations.Add(c);
        await uow.SaveChangesAsync(ct);
        return c.ToDto();
    }

    public async Task<ConsultationDto> UpdateAsync(Guid id, UpdateConsultationInput input, CancellationToken ct)
    {
        var c = await LoadAsync(id, ct);
        c.Reschedule(input.ScheduledAt, input.DurationMin, input.Kind);
        c.SetStatus(input.Status);
        c.UpdateRecord(input.Transcript, input.ChiefComplaint, input.Routine, input.PhysicalActivity,
                       input.Objective, input.ClinicalNotes);
        await uow.SaveChangesAsync(ct);
        return c.ToDto();
    }

    /// <summary>Transcrição → prontuário: a IA extrai queixa, rotina, atividade física e objetivo.</summary>
    public async Task<ConsultationDto> AnalyzeAsync(Guid id, CancellationToken ct)
    {
        if (!analyzer.IsConfigured)
            throw new ExternalServiceException("A análise por IA não está configurada no servidor (ANTHROPIC_API_KEY).");
        var c = await LoadAsync(id, ct);
        c.EnsureHasTranscript();
        var summary = await analyzer.AnalyzeAsync(c.Transcript!, ct);
        c.ApplyAiSummary(summary.ChiefComplaint, summary.Routine, summary.PhysicalActivity, summary.Objective, clock.UtcNow);
        await uow.SaveChangesAsync(ct);
        return c.ToDto();
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var c = await LoadAsync(id, ct);
        consultations.Remove(c);
        await uow.SaveChangesAsync(ct);
    }

    private async Task<Consultation> LoadAsync(Guid id, CancellationToken ct)
    {
        var c = await consultations.GetAsync(id, ct) ?? throw new NotFoundException("Consulta não encontrada.");
        await access.RequireOwnedPatientAsync(c.PatientId, ct);
        return c;
    }
}
