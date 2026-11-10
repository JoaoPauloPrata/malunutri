using System.Globalization;
using System.Text;
using MaluNutri.Application.Abstractions;
using MaluNutri.Application.Dtos;
using Microsoft.EntityFrameworkCore;

namespace MaluNutri.Infrastructure.Persistence;

/// <summary>Linha da view nutri.v_patient_overview (entidade sem chave, só leitura).</summary>
internal sealed class PatientOverviewRow
{
    public Guid Id { get; set; }
    public Guid NutritionistId { get; set; }
    public string FullName { get; set; } = default!;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string Status { get; set; } = default!;
    public string? Goal { get; set; }
    public string SearchName { get; set; } = default!;
    public bool HasAppAccess { get; set; }
    public int? Age { get; set; }
    public decimal? LastWeightKg { get; set; }
    public bool HasActivePlan { get; set; }
    public int PendingCheckIns { get; set; }
    public DateOnly? LastCheckIn { get; set; }
    public DateTimeOffset? NextConsultation { get; set; }
}

internal sealed class ReadQueries(NutriDbContext db) : IReadQueries
{
    public async Task<IReadOnlyList<PatientOverviewDto>> ListPatientsAsync(
        Guid nutritionistId, string? search, string? status, CancellationToken ct = default)
    {
        var q = db.Set<PatientOverviewRow>().Where(p => p.NutritionistId == nutritionistId);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(p => p.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = Normalize(search);
            q = q.Where(p => p.SearchName.Contains(term)); // índice trigram em search_name
        }
        var rows = await q.OrderBy(p => p.FullName).Take(500).ToListAsync(ct);
        return rows.Select(ToDto).ToList();
    }

    public async Task<PatientOverviewDto?> GetPatientOverviewAsync(Guid patientId, CancellationToken ct = default)
    {
        var row = await db.Set<PatientOverviewRow>().FirstOrDefaultAsync(p => p.Id == patientId, ct);
        return row is null ? null : ToDto(row);
    }

    public async Task<NutritionistTodayDto> NutritionistTodayAsync(Guid nutritionistId, DateOnly day, CancellationToken ct = default) =>
        SqlJson.Deserialize<NutritionistTodayDto>(await SqlJson.QueryAsync(db,
            "select nutri.fn_nutritionist_today(@n, @d)", ct, ("n", nutritionistId), ("d", day)));

    public async Task<PatientTodayDto> PatientTodayAsync(Guid patientId, DateOnly day, TimeOnly now, CancellationToken ct = default) =>
        SqlJson.Deserialize<PatientTodayDto>(await SqlJson.QueryAsync(db,
            "select nutri.fn_patient_today(@p, @d, @t)", ct, ("p", patientId), ("d", day), ("t", now)));

    public async Task<ProgressDto> ProgressAsync(Guid patientId, CancellationToken ct = default) =>
        SqlJson.Deserialize<ProgressDto>(await SqlJson.QueryAsync(db,
            "select nutri.fn_patient_progress(@p)", ct, ("p", patientId)));

    public async Task<MonthlyReportDto> MonthlyReportAsync(Guid patientId, DateOnly month, CancellationToken ct = default) =>
        SqlJson.Deserialize<MonthlyReportDto>(await SqlJson.QueryAsync(db,
            "select nutri.fn_monthly_report(@p, @m)", ct, ("p", patientId), ("m", month)));

    public async Task<IReadOnlyList<FoodDto>> SearchFoodsAsync(string? query, string? group, int limit, CancellationToken ct = default)
    {
        var q = db.Foods.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(group)) q = q.Where(f => f.FoodGroup == group);
        if (!string.IsNullOrWhiteSpace(query))
        {
            var term = Normalize(query);
            q = q.Where(f => EF.Property<string>(f, "SearchName").Contains(term));
        }
        return await q.OrderBy(f => f.Name).Take(limit)
            .Select(f => new FoodDto(f.Id, f.Name, f.FoodGroup, f.Kcal100g, f.Carb100g, f.Protein100g, f.Fat100g,
                                     f.HouseholdUnit, f.HouseholdGrams))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<SubstitutionDto>> SubstitutionsAsync(Guid foodId, decimal grams, CancellationToken ct = default) =>
        SqlJson.Deserialize<List<SubstitutionDto>>(await SqlJson.QueryAsync(db,
            "select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from nutri.fn_food_substitutions(@f, @g, 12) s",
            ct, ("f", foodId), ("g", grams)), snakeCase: true);

    private static PatientOverviewDto ToDto(PatientOverviewRow r) => new(
        r.Id, r.FullName, r.Email, r.Phone, r.Status, r.Goal, r.HasAppAccess, r.Age, r.LastWeightKg,
        r.HasActivePlan, r.PendingCheckIns, r.LastCheckIn, r.NextConsultation);

    /// <summary>Mesma normalização de nutri.f_normalize: minúsculas e sem acentos.</summary>
    private static string Normalize(string s)
    {
        var decomposed = s.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposed.Length);
        foreach (var ch in decomposed)
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark) sb.Append(ch);
        return sb.ToString().Normalize(NormalizationForm.FormC);
    }
}
