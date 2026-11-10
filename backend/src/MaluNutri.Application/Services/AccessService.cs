using MaluNutri.Application.Abstractions;
using MaluNutri.Application.Common;
using MaluNutri.Application.Dtos;
using MaluNutri.Domain.Patients;
using MaluNutri.Domain.Profiles;

namespace MaluNutri.Application.Services;

/// <summary>
/// Regras de autorização por recurso: a nutricionista só vê os próprios pacientes
/// e o paciente só vê os próprios dados. Escopo por requisição (cacheia o perfil).
/// </summary>
public sealed class AccessService(ICurrentUser user, IProfileRepository profiles, IPatientRepository patients)
{
    private Profile? _profile;

    public async Task<Profile> ProfileAsync(CancellationToken ct = default)
    {
        if (_profile is not null) return _profile;
        var userId = user.UserId ?? throw new UnauthorizedException();
        _profile = await profiles.GetAsync(userId, ct)
                   ?? throw new ForbiddenException("Sua conta ainda não está vinculada a um perfil. Fale com sua nutricionista.");
        return _profile;
    }

    public async Task<MeDto> MeAsync(CancellationToken ct = default)
    {
        var profile = await ProfileAsync(ct);
        Guid? patientId = null;
        if (profile.IsPatient)
            patientId = (await patients.GetByUserIdAsync(profile.Id, ct))?.Id;
        return new MeDto(profile.Id, profile.Email, profile.FullName, profile.Role, patientId);
    }

    public async Task<Profile> RequireNutritionistAsync(CancellationToken ct = default)
    {
        var profile = await ProfileAsync(ct);
        if (!profile.IsNutritionist) throw new ForbiddenException();
        return profile;
    }

    /// <summary>Paciente pertencente à nutricionista logada.</summary>
    public async Task<Patient> RequireOwnedPatientAsync(Guid patientId, CancellationToken ct = default)
    {
        var profile = await RequireNutritionistAsync(ct);
        var patient = await patients.GetAsync(patientId, ct);
        if (patient is null || patient.NutritionistId != profile.Id) throw new NotFoundException("Paciente não encontrado.");
        return patient;
    }

    /// <summary>Registro do paciente logado no app.</summary>
    public async Task<Patient> RequireSelfPatientAsync(CancellationToken ct = default)
    {
        var profile = await ProfileAsync(ct);
        if (!profile.IsPatient) throw new ForbiddenException();
        return await patients.GetByUserIdAsync(profile.Id, ct)
               ?? throw new ForbiddenException("Sua conta não está vinculada a um cadastro de paciente.");
    }

    /// <summary>Nutricionista dona do paciente OU o próprio paciente.</summary>
    public async Task<Patient> RequirePatientReadAsync(Guid patientId, CancellationToken ct = default)
    {
        var profile = await ProfileAsync(ct);
        if (profile.IsNutritionist) return await RequireOwnedPatientAsync(patientId, ct);
        var self = await RequireSelfPatientAsync(ct);
        if (self.Id != patientId) throw new NotFoundException("Paciente não encontrado.");
        return self;
    }
}
