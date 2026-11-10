namespace MaluNutri.Domain.Profiles;

public static class Roles
{
    public const string Nutritionist = "nutritionist";
    public const string Patient = "patient";
}

/// <summary>Perfil 1:1 com auth.users do Supabase. Criado por trigger no banco.</summary>
public class Profile
{
    public Guid Id { get; private set; }
    public string Email { get; private set; } = default!;
    public string Role { get; private set; } = default!;
    public string FullName { get; private set; } = default!;
    public DateTimeOffset CreatedAt { get; private set; }

    private Profile() { }

    public bool IsNutritionist => Role == Roles.Nutritionist;
    public bool IsPatient => Role == Roles.Patient;
}
