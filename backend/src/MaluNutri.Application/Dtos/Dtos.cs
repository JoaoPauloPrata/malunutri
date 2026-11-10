namespace MaluNutri.Application.Dtos;

// ---------------------------------------------------------------- Conta
public sealed record MeDto(Guid Id, string Email, string FullName, string Role, Guid? PatientId);

// ---------------------------------------------------------------- Pacientes
public sealed record PatientOverviewDto(
    Guid Id, string FullName, string? Email, string? Phone, string Status, string? Goal,
    bool HasAppAccess, int? Age, decimal? LastWeightKg, bool HasActivePlan, int PendingCheckIns,
    DateOnly? LastCheckIn, DateTimeOffset? NextConsultation);

public sealed record PatientDto(
    Guid Id, string FullName, string? Email, string? Phone, DateOnly? BirthDate, string? Sex,
    decimal? HeightCm, string? Goal, string? Notes, decimal ProteinTargetG, int WaterTargetMl,
    string Status, bool HasAppAccess, DateTimeOffset CreatedAt);

public sealed record PatientInput(
    string FullName, string? Email, string? Phone, DateOnly? BirthDate, string? Sex,
    decimal? HeightCm, string? Goal, string? Notes, decimal? ProteinTargetG, int? WaterTargetMl);

public sealed record PatientStatusInput(string Status);

// ---------------------------------------------------------------- Consultas
public sealed record ConsultationDto(
    Guid Id, Guid PatientId, DateTimeOffset ScheduledAt, int DurationMin, string Kind, string Status,
    string? Transcript, string? ChiefComplaint, string? Routine, string? PhysicalActivity,
    string? Objective, string? ClinicalNotes, DateTimeOffset? AiProcessedAt);

public sealed record ScheduleConsultationInput(DateTimeOffset ScheduledAt, int DurationMin, string Kind);

public sealed record UpdateConsultationInput(
    DateTimeOffset ScheduledAt, int DurationMin, string Kind, string Status,
    string? Transcript, string? ChiefComplaint, string? Routine, string? PhysicalActivity,
    string? Objective, string? ClinicalNotes);

// ---------------------------------------------------------------- Plano alimentar
public sealed record MealPlanDto(
    Guid Id, Guid PatientId, string Title, string Status, string? Notes,
    DateTimeOffset? PublishedAt, DateTimeOffset CreatedAt, IReadOnlyList<MealPlanItemDto> Items);

public sealed record MealPlanSummaryDto(Guid Id, string Title, string Status, DateTimeOffset? PublishedAt, DateTimeOffset CreatedAt, int Meals);

public sealed record MealPlanItemDto(
    Guid Id, string Meal, string MealTime, string Description, string? Tip, decimal? ProteinG,
    IReadOnlyList<MealPlanItemFoodDto> Foods);

public sealed record MealPlanItemFoodDto(Guid FoodId, string FoodName, decimal Grams);

public sealed record MealPlanInput(string Title, string? Notes, IReadOnlyList<MealPlanItemInput> Items);

public sealed record MealPlanItemInput(
    string Meal, string MealTime, string Description, string? Tip, decimal? ProteinG,
    IReadOnlyList<MealPlanItemFoodInput>? Foods);

public sealed record MealPlanItemFoodInput(Guid FoodId, decimal Grams);

// ---------------------------------------------------------------- Alimentos / trocas
public sealed record FoodDto(Guid Id, string Name, string FoodGroup, decimal Kcal100g,
                             decimal Carb100g, decimal Protein100g, decimal Fat100g,
                             string? HouseholdUnit, decimal? HouseholdGrams);

public sealed record SubstitutionDto(Guid FoodId, string Name, decimal Grams, string? Household);

// ---------------------------------------------------------------- Exames
public sealed record ExamPanelDto(Guid Id, DateOnly CollectedAt, string Title, string? AttentionNote,
                                  IReadOnlyList<ExamResultDto> Results);

public sealed record ExamResultDto(Guid Id, string ExamName, decimal Value, string Unit,
                                   decimal? RefMin, decimal? RefMax, string Status);

public sealed record ExamPanelInput(DateOnly CollectedAt, string Title, string? AttentionNote,
                                    IReadOnlyList<ExamResultInput> Results);

public sealed record ExamResultInput(string ExamName, decimal Value, string Unit, decimal? RefMin, decimal? RefMax);

// ---------------------------------------------------------------- Check-in
public sealed record CheckInDto(
    Guid Id, Guid PatientId, DateOnly WeekStart, short Adherence, string Hunger, string Sleep,
    IReadOnlyList<string> Hardest, decimal? WeightKg, decimal? WaistCm, string? Comment,
    DateTimeOffset? ReviewedAt, DateTimeOffset CreatedAt);

public sealed record CheckInInput(short Adherence, string Hunger, string Sleep, string[]? Hardest,
                                  decimal? WeightKg, decimal? WaistCm, string? Comment);

// ---------------------------------------------------------------- Recados e registro diário
public sealed record NoteDto(Guid Id, string Body, DateTimeOffset CreatedAt, DateTimeOffset? ReadAt);

public sealed record NoteInput(string Body);

public sealed record DailyLogDto(int WaterMl, decimal ProteinG);

public sealed record DailyLogInput(int WaterDeltaMl, decimal ProteinDeltaG);

// ---------------------------------------------------------------- Painéis (JSON das funções SQL)
public sealed record NutritionistTodayDto(
    IReadOnlyList<TodayConsultationDto> Consultations, int PlansToBuild, int NewCheckIns,
    int ActivePatients, IReadOnlyList<RecentCheckInDto> RecentCheckIns);

public sealed record TodayConsultationDto(Guid Id, Guid PatientId, string PatientName, DateTimeOffset ScheduledAt,
                                          int DurationMin, string Kind, string Status);

public sealed record RecentCheckInDto(Guid Id, Guid PatientId, string PatientName, short Adherence,
                                      decimal? WeightKg, DateTimeOffset CreatedAt);

public sealed record PatientTodayDto(
    string FirstName, int? WeekNumber, CurrentMealDto? CurrentMeal, decimal ProteinG, decimal ProteinTargetG,
    int WaterMl, int WaterTargetMl, bool CheckInDone, int UnreadNotes);

public sealed record CurrentMealDto(Guid Id, string Meal, string MealTime, string Description, string? Tip);

public sealed record ProgressDto(
    IReadOnlyList<ProgressPointDto> Points, int CheckInCount, int Weeks, decimal? CurrentWeightKg,
    decimal? WeightChangeKg, decimal? WaistChangeCm, decimal? AvgAdherence, NoteDto? LatestNote);

public sealed record ProgressPointDto(DateOnly WeekStart, decimal? WeightKg, decimal? WaistCm, short Adherence);

public sealed record MonthlyReportDto(
    string Month, int CheckIns, decimal? AvgAdherence, decimal? WeightStartKg, decimal? WeightEndKg,
    IReadOnlyList<HardestCountDto> Hardest, int SleepGood);

public sealed record HardestCountDto(string Item, int Count);
