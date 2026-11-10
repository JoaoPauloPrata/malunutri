using MaluNutri.Domain.Common;

namespace MaluNutri.Domain.Consultations;

public static class ConsultationStatus
{
    public const string Scheduled = "agendada";
    public const string Done = "realizada";
    public const string Canceled = "cancelada";
    public static readonly string[] All = [Scheduled, Done, Canceled];
}

public class Consultation
{
    public Guid Id { get; private set; }
    public Guid PatientId { get; private set; }
    public DateTimeOffset ScheduledAt { get; private set; }
    public int DurationMin { get; private set; } = 60;
    public string Kind { get; private set; } = "retorno";
    public string Status { get; private set; } = ConsultationStatus.Scheduled;
    public string? Transcript { get; private set; }
    public string? ChiefComplaint { get; private set; }
    public string? Routine { get; private set; }
    public string? PhysicalActivity { get; private set; }
    public string? Objective { get; private set; }
    public string? ClinicalNotes { get; private set; }
    public DateTimeOffset? AiProcessedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    private Consultation() { }

    public static Consultation Schedule(Guid patientId, DateTimeOffset at, int durationMin, string kind)
    {
        var c = new Consultation { Id = Guid.NewGuid(), PatientId = patientId };
        c.Reschedule(at, durationMin, kind);
        return c;
    }

    public void Reschedule(DateTimeOffset at, int durationMin, string kind)
    {
        if (durationMin is < 10 or > 240) throw new DomainException("Duração deve estar entre 10 e 240 minutos.");
        ScheduledAt = at.ToUniversalTime();
        DurationMin = durationMin;
        Kind = Guard.OneOf(kind, "Tipo de consulta", ["primeira", "retorno"]);
    }

    public void SetStatus(string status) => Status = Guard.OneOf(status, "Status", ConsultationStatus.All);

    public void UpdateRecord(string? transcript, string? chiefComplaint, string? routine,
                             string? physicalActivity, string? objective, string? clinicalNotes)
    {
        Transcript = Guard.Optional(transcript, "Transcrição", 100_000);
        ChiefComplaint = Guard.Optional(chiefComplaint, "Queixa principal");
        Routine = Guard.Optional(routine, "Rotina");
        PhysicalActivity = Guard.Optional(physicalActivity, "Atividade física");
        Objective = Guard.Optional(objective, "Objetivo");
        ClinicalNotes = Guard.Optional(clinicalNotes, "Notas clínicas", 10_000);
    }

    public void EnsureHasTranscript()
    {
        if (string.IsNullOrWhiteSpace(Transcript))
            throw new DomainException("Não há transcrição para analisar.");
    }

    /// <summary>Preenche o prontuário com o que a IA extraiu; campos vazios não apagam o que já existe.</summary>
    public void ApplyAiSummary(string? chiefComplaint, string? routine, string? physicalActivity,
                               string? objective, DateTimeOffset now)
    {
        EnsureHasTranscript();
        ChiefComplaint = Guard.Optional(chiefComplaint, "Queixa principal") ?? ChiefComplaint;
        Routine = Guard.Optional(routine, "Rotina") ?? Routine;
        PhysicalActivity = Guard.Optional(physicalActivity, "Atividade física") ?? PhysicalActivity;
        Objective = Guard.Optional(objective, "Objetivo") ?? Objective;
        AiProcessedAt = now;
    }
}
