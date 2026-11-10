using MaluNutri.Application.Dtos;
using MaluNutri.Domain.CheckIns;
using MaluNutri.Domain.Consultations;
using MaluNutri.Domain.Exams;
using MaluNutri.Domain.MealPlans;
using MaluNutri.Domain.Notes;
using MaluNutri.Domain.Patients;
using MaluNutri.Domain.Profiles;

namespace MaluNutri.Application.Abstractions;

/// <summary>Usuário autenticado (claims do JWT do Supabase).</summary>
public interface ICurrentUser
{
    Guid? UserId { get; }
}

public interface IClock
{
    DateTimeOffset UtcNow { get; }
    /// <summary>Data local da clínica (America/Sao_Paulo).</summary>
    DateOnly Today { get; }
    TimeOnly LocalTime { get; }
}

public interface IUnitOfWork
{
    Task SaveChangesAsync(CancellationToken ct = default);
    Task ExecuteInTransactionAsync(Func<Task> work, CancellationToken ct = default);
}

// ---------------------------------------------------------------- Repositórios (escrita)

public interface IProfileRepository
{
    Task<Profile?> GetAsync(Guid id, CancellationToken ct = default);
}

public interface IPatientRepository
{
    Task<Patient?> GetAsync(Guid id, CancellationToken ct = default);
    Task<Patient?> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<bool> EmailInUseAsync(Guid nutritionistId, string email, Guid? exceptPatientId, CancellationToken ct = default);
    void Add(Patient patient);
}

public interface IConsultationRepository
{
    Task<Consultation?> GetAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Consultation>> ListByPatientAsync(Guid patientId, CancellationToken ct = default);
    void Add(Consultation consultation);
    void Remove(Consultation consultation);
}

public interface IMealPlanRepository
{
    Task<MealPlan?> GetAsync(Guid id, CancellationToken ct = default);
    Task<MealPlan?> GetActiveAsync(Guid patientId, CancellationToken ct = default);
    Task<IReadOnlyList<MealPlan>> ListByPatientAsync(Guid patientId, CancellationToken ct = default);
    void Add(MealPlan plan);
    void Remove(MealPlan plan);
}

public interface IExamRepository
{
    Task<ExamPanel?> GetAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<ExamPanel>> ListByPatientAsync(Guid patientId, CancellationToken ct = default);
    void Add(ExamPanel panel);
    void Remove(ExamPanel panel);
}

public interface ICheckInRepository
{
    Task<CheckIn?> GetAsync(Guid id, CancellationToken ct = default);
    Task<CheckIn?> GetByWeekAsync(Guid patientId, DateOnly weekStart, CancellationToken ct = default);
    Task<IReadOnlyList<CheckIn>> ListByPatientAsync(Guid patientId, int take, CancellationToken ct = default);
    void Add(CheckIn checkIn);
}

public interface INoteRepository
{
    Task<IReadOnlyList<Note>> ListByPatientAsync(Guid patientId, int take, CancellationToken ct = default);
    void Add(Note note);
    Task MarkAllReadAsync(Guid patientId, DateTimeOffset now, CancellationToken ct = default);
}

public interface IDailyLogRepository
{
    /// <summary>Soma atômica via nutri.fn_add_daily_log.</summary>
    Task<DailyLogDto> AddAsync(Guid patientId, DateOnly day, int waterDeltaMl, decimal proteinDeltaG, CancellationToken ct = default);
}

// ---------------------------------------------------------------- Consultas de leitura (views/funções SQL)

public interface IReadQueries
{
    Task<IReadOnlyList<PatientOverviewDto>> ListPatientsAsync(Guid nutritionistId, string? search, string? status, CancellationToken ct = default);
    Task<PatientOverviewDto?> GetPatientOverviewAsync(Guid patientId, CancellationToken ct = default);
    Task<NutritionistTodayDto> NutritionistTodayAsync(Guid nutritionistId, DateOnly day, CancellationToken ct = default);
    Task<PatientTodayDto> PatientTodayAsync(Guid patientId, DateOnly day, TimeOnly now, CancellationToken ct = default);
    Task<ProgressDto> ProgressAsync(Guid patientId, CancellationToken ct = default);
    Task<MonthlyReportDto> MonthlyReportAsync(Guid patientId, DateOnly month, CancellationToken ct = default);
    Task<IReadOnlyList<FoodDto>> SearchFoodsAsync(string? query, string? group, int limit, CancellationToken ct = default);
    Task<IReadOnlyList<SubstitutionDto>> SubstitutionsAsync(Guid foodId, decimal grams, CancellationToken ct = default);
}

// ---------------------------------------------------------------- Integrações

public interface IAuthAdmin
{
    /// <summary>Envia convite do Supabase Auth; o trigger no banco vincula o usuário ao paciente pelo e-mail.</summary>
    Task InviteAsync(string email, string fullName, CancellationToken ct = default);
}

public interface ITranscriptAnalyzer
{
    bool IsConfigured { get; }
    Task<TranscriptSummary> AnalyzeAsync(string transcript, CancellationToken ct = default);
}

public sealed record TranscriptSummary(string? ChiefComplaint, string? Routine, string? PhysicalActivity, string? Objective);
