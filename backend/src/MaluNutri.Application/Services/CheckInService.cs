using MaluNutri.Application.Abstractions;
using MaluNutri.Application.Common;
using MaluNutri.Application.Dtos;
using MaluNutri.Domain.CheckIns;

namespace MaluNutri.Application.Services;

public sealed class CheckInService(AccessService access, ICheckInRepository checkIns, IClock clock, IUnitOfWork uow)
{
    public async Task<IReadOnlyList<CheckInDto>> ListAsync(Guid patientId, CancellationToken ct)
    {
        await access.RequirePatientReadAsync(patientId, ct);
        return (await checkIns.ListByPatientAsync(patientId, 52, ct)).Select(c => c.ToDto()).ToList();
    }

    public async Task<IReadOnlyList<CheckInDto>> ListMineAsync(CancellationToken ct)
    {
        var me = await access.RequireSelfPatientAsync(ct);
        return (await checkIns.ListByPatientAsync(me.Id, 52, ct)).Select(c => c.ToDto()).ToList();
    }

    /// <summary>Check-in de um minuto: um por semana; reenviar na mesma semana atualiza as respostas.</summary>
    public async Task<CheckInDto> SubmitAsync(CheckInInput input, CancellationToken ct)
    {
        var me = await access.RequireSelfPatientAsync(ct);
        var data = new CheckInData(input.Adherence, input.Hunger, input.Sleep, input.Hardest ?? [],
                                   input.WeightKg, input.WaistCm, input.Comment);
        var existing = await checkIns.GetByWeekAsync(me.Id, CheckIn.WeekOf(clock.Today), ct);
        if (existing is not null)
        {
            existing.Apply(data);
            await uow.SaveChangesAsync(ct);
            return existing.ToDto();
        }

        var checkIn = CheckIn.Submit(me.Id, clock.Today, data, clock.UtcNow);
        checkIns.Add(checkIn);
        await uow.SaveChangesAsync(ct);
        return checkIn.ToDto();
    }

    public async Task<CheckInDto> MarkReviewedAsync(Guid id, CancellationToken ct)
    {
        var checkIn = await checkIns.GetAsync(id, ct) ?? throw new NotFoundException("Check-in não encontrado.");
        await access.RequireOwnedPatientAsync(checkIn.PatientId, ct);
        checkIn.MarkReviewed(clock.UtcNow);
        await uow.SaveChangesAsync(ct);
        return checkIn.ToDto();
    }
}
