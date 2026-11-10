using MaluNutri.Application.Abstractions;
using MaluNutri.Application.Common;
using MaluNutri.Application.Dtos;
using MaluNutri.Domain.Patients;

namespace MaluNutri.Application.Services;

public sealed class PatientService(
    AccessService access, IPatientRepository patients, IReadQueries queries, IAuthAdmin authAdmin, IUnitOfWork uow)
{
    public async Task<IReadOnlyList<PatientOverviewDto>> ListAsync(string? search, string? status, CancellationToken ct)
    {
        var me = await access.RequireNutritionistAsync(ct);
        return await queries.ListPatientsAsync(me.Id, search, status, ct);
    }

    public async Task<PatientDto> GetAsync(Guid id, CancellationToken ct) =>
        (await access.RequireOwnedPatientAsync(id, ct)).ToDto();

    public async Task<PatientDto> CreateAsync(PatientInput input, CancellationToken ct)
    {
        var me = await access.RequireNutritionistAsync(ct);
        var patient = Patient.Create(me.Id, input.ToData());
        await EnsureEmailFreeAsync(me.Id, patient.Email, null, ct);
        patients.Add(patient);
        await uow.SaveChangesAsync(ct);
        return patient.ToDto();
    }

    public async Task<PatientDto> UpdateAsync(Guid id, PatientInput input, CancellationToken ct)
    {
        var patient = await access.RequireOwnedPatientAsync(id, ct);
        patient.Update(input.ToData());
        await EnsureEmailFreeAsync(patient.NutritionistId, patient.Email, patient.Id, ct);
        await uow.SaveChangesAsync(ct);
        return patient.ToDto();
    }

    public async Task<PatientDto> SetStatusAsync(Guid id, string status, CancellationToken ct)
    {
        var patient = await access.RequireOwnedPatientAsync(id, ct);
        patient.SetStatus(status);
        await uow.SaveChangesAsync(ct);
        return patient.ToDto();
    }

    /// <summary>Libera o app: o Supabase envia o convite e o trigger vincula a conta ao paciente.</summary>
    public async Task InviteAsync(Guid id, CancellationToken ct)
    {
        var patient = await access.RequireOwnedPatientAsync(id, ct);
        patient.EnsureCanInvite();
        await authAdmin.InviteAsync(patient.Email!, patient.FullName, ct);
    }

    private async Task EnsureEmailFreeAsync(Guid nutritionistId, string? email, Guid? exceptId, CancellationToken ct)
    {
        if (email is not null && await patients.EmailInUseAsync(nutritionistId, email, exceptId, ct))
            throw new ConflictException("Já existe um paciente com este e-mail.");
    }
}
