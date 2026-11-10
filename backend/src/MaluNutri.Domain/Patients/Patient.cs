using MaluNutri.Domain.Common;

namespace MaluNutri.Domain.Patients;

public static class PatientStatus
{
    public const string Active = "active";
    public const string Paused = "paused";
    public const string Archived = "archived";
    public static readonly string[] All = [Active, Paused, Archived];
}

public class Patient
{
    public Guid Id { get; private set; }
    public Guid NutritionistId { get; private set; }
    public Guid? UserId { get; private set; }
    public string FullName { get; private set; } = default!;
    public string? Email { get; private set; }
    public string? Phone { get; private set; }
    public DateOnly? BirthDate { get; private set; }
    public string? Sex { get; private set; }
    public decimal? HeightCm { get; private set; }
    public string? Goal { get; private set; }
    public string? Notes { get; private set; }
    public decimal ProteinTargetG { get; private set; } = 100;
    public int WaterTargetMl { get; private set; } = 2500;
    public string Status { get; private set; } = PatientStatus.Active;
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    private Patient() { }

    public static Patient Create(Guid nutritionistId, PatientData data)
    {
        var p = new Patient { Id = Guid.NewGuid(), NutritionistId = nutritionistId };
        p.Update(data);
        return p;
    }

    public void Update(PatientData d)
    {
        var email = Guard.Optional(d.Email, "E-mail", 200)?.ToLowerInvariant();
        if (UserId is not null && email != Email)
            throw new DomainException("O e-mail não pode ser alterado depois que o paciente tem acesso ao app.");

        FullName = Guard.Required(d.FullName, "Nome", 160);
        Email = email;
        Phone = Guard.Optional(d.Phone, "Telefone", 30);
        if (d.BirthDate is { } b && (b > DateOnly.FromDateTime(DateTime.UtcNow) || b.Year < 1900))
            throw new DomainException("Data de nascimento inválida.");
        BirthDate = d.BirthDate;
        Sex = d.Sex is null ? null : Guard.OneOf(d.Sex, "Sexo", ["F", "M", "O"]);
        HeightCm = Guard.Range(d.HeightCm, "Altura", 50, 250);
        Goal = Guard.Optional(d.Goal, "Objetivo", 500);
        Notes = Guard.Optional(d.Notes, "Observações");
        ProteinTargetG = Guard.Range(d.ProteinTargetG, "Meta de proteína", 10, 400) ?? 100;
        WaterTargetMl = d.WaterTargetMl is >= 500 and <= 8000
            ? d.WaterTargetMl
            : throw new DomainException("Meta de água deve estar entre 500 e 8000 ml.");
    }

    public void SetStatus(string status) => Status = Guard.OneOf(status, "Status", PatientStatus.All);

    public void EnsureCanInvite()
    {
        if (string.IsNullOrWhiteSpace(Email))
            throw new DomainException("Cadastre o e-mail do paciente para liberar o acesso ao app.");
        if (UserId is not null)
            throw new DomainException("Este paciente já tem acesso ao app.");
    }
}

public sealed record PatientData(
    string FullName, string? Email, string? Phone, DateOnly? BirthDate, string? Sex,
    decimal? HeightCm, string? Goal, string? Notes, decimal ProteinTargetG, int WaterTargetMl);
