using MaluNutri.Application.Dtos;
using MaluNutri.Domain.CheckIns;
using MaluNutri.Domain.Consultations;
using MaluNutri.Domain.Exams;
using MaluNutri.Domain.MealPlans;
using MaluNutri.Domain.Notes;
using MaluNutri.Domain.Patients;

namespace MaluNutri.Application.Common;

internal static class Mappings
{
    public static PatientDto ToDto(this Patient p) => new(
        p.Id, p.FullName, p.Email, p.Phone, p.BirthDate, p.Sex, p.HeightCm, p.Goal, p.Notes,
        p.ProteinTargetG, p.WaterTargetMl, p.Status, p.UserId is not null, p.CreatedAt);

    public static PatientData ToData(this PatientInput i) => new(
        i.FullName, i.Email, i.Phone, i.BirthDate, i.Sex, i.HeightCm, i.Goal, i.Notes,
        i.ProteinTargetG ?? 100, i.WaterTargetMl ?? 2500);

    public static ConsultationDto ToDto(this Consultation c) => new(
        c.Id, c.PatientId, c.ScheduledAt, c.DurationMin, c.Kind, c.Status, c.Transcript,
        c.ChiefComplaint, c.Routine, c.PhysicalActivity, c.Objective, c.ClinicalNotes, c.AiProcessedAt);

    public static MealPlanDto ToDto(this MealPlan m) => new(
        m.Id, m.PatientId, m.Title, m.Status, m.Notes, m.PublishedAt, m.CreatedAt,
        m.Items.OrderBy(i => i.MealTime).Select(i => new MealPlanItemDto(
            i.Id, i.Meal, i.MealTime.ToString("HH:mm"), i.Description, i.Tip, i.ProteinG,
            i.Foods.Select(f => new MealPlanItemFoodDto(f.FoodId, f.Food?.Name ?? "", f.Grams)).ToList())).ToList());

    public static MealPlanSummaryDto ToSummary(this MealPlan m) =>
        new(m.Id, m.Title, m.Status, m.PublishedAt, m.CreatedAt, m.Items.Count);

    public static ExamPanelDto ToDto(this ExamPanel e) => new(
        e.Id, e.CollectedAt, e.Title, e.AttentionNote,
        e.Results.OrderBy(r => r.ExamName)
            .Select(r => new ExamResultDto(r.Id, r.ExamName, r.Value, r.Unit, r.RefMin, r.RefMax, r.Status)).ToList());

    public static CheckInDto ToDto(this CheckIn c) => new(
        c.Id, c.PatientId, c.WeekStart, c.Adherence, c.Hunger, c.Sleep, c.Hardest, c.WeightKg, c.WaistCm,
        c.Comment, c.ReviewedAt, c.CreatedAt);

    public static NoteDto ToDto(this Note n) => new(n.Id, n.Body, n.CreatedAt, n.ReadAt);
}
