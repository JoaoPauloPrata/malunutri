using MaluNutri.Domain.Common;

namespace MaluNutri.Domain.Notes;

/// <summary>Recado da nutricionista para o paciente.</summary>
public class Note
{
    public Guid Id { get; private set; }
    public Guid PatientId { get; private set; }
    public string Body { get; private set; } = default!;
    public DateTimeOffset? ReadAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private Note() { }

    public static Note Write(Guid patientId, string body, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        PatientId = patientId,
        Body = Guard.Required(body, "Recado", 2000),
        CreatedAt = now,
    };

    public void MarkRead(DateTimeOffset now) => ReadAt ??= now;
}
