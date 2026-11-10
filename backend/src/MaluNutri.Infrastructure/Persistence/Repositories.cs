using MaluNutri.Application.Abstractions;
using MaluNutri.Application.Dtos;
using MaluNutri.Domain.CheckIns;
using MaluNutri.Domain.Consultations;
using MaluNutri.Domain.Exams;
using MaluNutri.Domain.MealPlans;
using MaluNutri.Domain.Notes;
using MaluNutri.Domain.Patients;
using MaluNutri.Domain.Profiles;
using Microsoft.EntityFrameworkCore;

namespace MaluNutri.Infrastructure.Persistence;

internal sealed class UnitOfWork(NutriDbContext db) : IUnitOfWork
{
    public Task SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);

    public async Task ExecuteInTransactionAsync(Func<Task> work, CancellationToken ct = default)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await work();
        await tx.CommitAsync(ct);
    }
}

internal sealed class ProfileRepository(NutriDbContext db) : IProfileRepository
{
    public Task<Profile?> GetAsync(Guid id, CancellationToken ct = default) =>
        db.Profiles.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct);
}

internal sealed class PatientRepository(NutriDbContext db) : IPatientRepository
{
    public Task<Patient?> GetAsync(Guid id, CancellationToken ct = default) =>
        db.Patients.FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<Patient?> GetByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        db.Patients.FirstOrDefaultAsync(p => p.UserId == userId, ct);

    public Task<bool> EmailInUseAsync(Guid nutritionistId, string email, Guid? exceptPatientId, CancellationToken ct = default) =>
        db.Patients.AnyAsync(p => p.NutritionistId == nutritionistId && p.Email == email && p.Id != exceptPatientId, ct);

    public void Add(Patient patient) => db.Patients.Add(patient);
}

internal sealed class ConsultationRepository(NutriDbContext db) : IConsultationRepository
{
    public Task<Consultation?> GetAsync(Guid id, CancellationToken ct = default) =>
        db.Consultations.FirstOrDefaultAsync(c => c.Id == id, ct);

    public async Task<IReadOnlyList<Consultation>> ListByPatientAsync(Guid patientId, CancellationToken ct = default) =>
        await db.Consultations.Where(c => c.PatientId == patientId).OrderByDescending(c => c.ScheduledAt).ToListAsync(ct);

    public void Add(Consultation consultation) => db.Consultations.Add(consultation);
    public void Remove(Consultation consultation) => db.Consultations.Remove(consultation);
}

internal sealed class MealPlanRepository(NutriDbContext db) : IMealPlanRepository
{
    private IQueryable<MealPlan> WithItems() =>
        db.MealPlans.Include(p => p.Items).ThenInclude(i => i.Foods).ThenInclude(f => f.Food).AsSplitQuery();

    public Task<MealPlan?> GetAsync(Guid id, CancellationToken ct = default) =>
        WithItems().FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<MealPlan?> GetActiveAsync(Guid patientId, CancellationToken ct = default) =>
        WithItems().FirstOrDefaultAsync(p => p.PatientId == patientId && p.Status == MealPlanStatus.Active, ct);

    public async Task<IReadOnlyList<MealPlan>> ListByPatientAsync(Guid patientId, CancellationToken ct = default) =>
        await db.MealPlans.Include(p => p.Items).AsNoTracking()
            .Where(p => p.PatientId == patientId).OrderByDescending(p => p.CreatedAt).ToListAsync(ct);

    public void Add(MealPlan plan) => db.MealPlans.Add(plan);
    public void Remove(MealPlan plan) => db.MealPlans.Remove(plan);
}

internal sealed class ExamRepository(NutriDbContext db) : IExamRepository
{
    public Task<ExamPanel?> GetAsync(Guid id, CancellationToken ct = default) =>
        db.ExamPanels.Include(e => e.Results).FirstOrDefaultAsync(e => e.Id == id, ct);

    public async Task<IReadOnlyList<ExamPanel>> ListByPatientAsync(Guid patientId, CancellationToken ct = default) =>
        await db.ExamPanels.Include(e => e.Results).AsNoTracking()
            .Where(e => e.PatientId == patientId).OrderByDescending(e => e.CollectedAt).ToListAsync(ct);

    public void Add(ExamPanel panel) => db.ExamPanels.Add(panel);
    public void Remove(ExamPanel panel) => db.ExamPanels.Remove(panel);
}

internal sealed class CheckInRepository(NutriDbContext db) : ICheckInRepository
{
    public Task<CheckIn?> GetAsync(Guid id, CancellationToken ct = default) =>
        db.CheckIns.FirstOrDefaultAsync(c => c.Id == id, ct);

    public Task<CheckIn?> GetByWeekAsync(Guid patientId, DateOnly weekStart, CancellationToken ct = default) =>
        db.CheckIns.FirstOrDefaultAsync(c => c.PatientId == patientId && c.WeekStart == weekStart, ct);

    public async Task<IReadOnlyList<CheckIn>> ListByPatientAsync(Guid patientId, int take, CancellationToken ct = default) =>
        await db.CheckIns.AsNoTracking().Where(c => c.PatientId == patientId)
            .OrderByDescending(c => c.WeekStart).Take(take).ToListAsync(ct);

    public void Add(CheckIn checkIn) => db.CheckIns.Add(checkIn);
}

internal sealed class NoteRepository(NutriDbContext db) : INoteRepository
{
    public async Task<IReadOnlyList<Note>> ListByPatientAsync(Guid patientId, int take, CancellationToken ct = default) =>
        await db.Notes.AsNoTracking().Where(n => n.PatientId == patientId)
            .OrderByDescending(n => n.CreatedAt).Take(take).ToListAsync(ct);

    public void Add(Note note) => db.Notes.Add(note);

    public Task MarkAllReadAsync(Guid patientId, DateTimeOffset now, CancellationToken ct = default) =>
        db.Notes.Where(n => n.PatientId == patientId && n.ReadAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.ReadAt, now), ct);
}

internal sealed class DailyLogRepository(NutriDbContext db) : IDailyLogRepository
{
    public async Task<DailyLogDto> AddAsync(Guid patientId, DateOnly day, int waterDeltaMl, decimal proteinDeltaG, CancellationToken ct = default)
    {
        var json = await SqlJson.QueryAsync(db,
            "select to_jsonb(d) from nutri.fn_add_daily_log(@p, @d, @w, @pr) d",
            ct, ("p", patientId), ("d", day), ("w", waterDeltaMl), ("pr", proteinDeltaG));
        return SqlJson.Deserialize<DailyLogDto>(json, snakeCase: true);
    }
}
