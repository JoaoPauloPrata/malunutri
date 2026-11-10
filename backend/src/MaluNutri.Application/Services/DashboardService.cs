using MaluNutri.Application.Abstractions;
using MaluNutri.Application.Dtos;
using MaluNutri.Domain.Common;

namespace MaluNutri.Application.Services;

/// <summary>Painéis e relatórios — leituras agregadas feitas por funções SQL no Postgres.</summary>
public sealed class DashboardService(
    AccessService access, IReadQueries queries, IDailyLogRepository dailyLogs, IClock clock)
{
    public async Task<NutritionistTodayDto> NutritionistTodayAsync(DateOnly? day, CancellationToken ct)
    {
        var me = await access.RequireNutritionistAsync(ct);
        return await queries.NutritionistTodayAsync(me.Id, day ?? clock.Today, ct);
    }

    public async Task<PatientTodayDto> PatientTodayAsync(CancellationToken ct)
    {
        var me = await access.RequireSelfPatientAsync(ct);
        return await queries.PatientTodayAsync(me.Id, clock.Today, clock.LocalTime, ct);
    }

    public async Task<ProgressDto> ProgressAsync(Guid patientId, CancellationToken ct)
    {
        await access.RequirePatientReadAsync(patientId, ct);
        return await queries.ProgressAsync(patientId, ct);
    }

    public async Task<ProgressDto> MyProgressAsync(CancellationToken ct)
    {
        var me = await access.RequireSelfPatientAsync(ct);
        return await queries.ProgressAsync(me.Id, ct);
    }

    public async Task<MonthlyReportDto> MonthlyReportAsync(Guid patientId, DateOnly? month, CancellationToken ct)
    {
        await access.RequirePatientReadAsync(patientId, ct);
        var m = month ?? clock.Today;
        return await queries.MonthlyReportAsync(patientId, new DateOnly(m.Year, m.Month, 1), ct);
    }

    public async Task<DailyLogDto> AddDailyLogAsync(DailyLogInput input, CancellationToken ct)
    {
        var me = await access.RequireSelfPatientAsync(ct);
        if (input.WaterDeltaMl is < -5000 or > 5000 || input.ProteinDeltaG is < -300 or > 300)
            throw new DomainException("Valor de registro fora do intervalo permitido.");
        return await dailyLogs.AddAsync(me.Id, clock.Today, input.WaterDeltaMl, input.ProteinDeltaG, ct);
    }

    public async Task<IReadOnlyList<FoodDto>> SearchFoodsAsync(string? query, string? group, CancellationToken ct)
    {
        await access.ProfileAsync(ct);
        return await queries.SearchFoodsAsync(query, group, 200, ct);
    }

    /// <summary>Balança de substituições: equivalentes para a quantidade informada.</summary>
    public async Task<IReadOnlyList<SubstitutionDto>> SubstitutionsAsync(Guid foodId, decimal grams, CancellationToken ct)
    {
        await access.ProfileAsync(ct);
        if (grams is <= 0 or > 2000) throw new DomainException("Quantidade deve estar entre 1 e 2000 g.");
        return await queries.SubstitutionsAsync(foodId, grams, ct);
    }
}
