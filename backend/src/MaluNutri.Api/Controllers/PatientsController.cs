using MaluNutri.Application.Dtos;
using MaluNutri.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MaluNutri.Api.Controllers;

/// <summary>Área da nutricionista: cadastro e prontuário organizado por paciente.</summary>
[ApiController, Authorize, Route("api/patients")]
public sealed class PatientsController(
    PatientService patients, ConsultationService consultations, MealPlanService mealPlans,
    ExamService exams, CheckInService checkIns, NoteService notes, DashboardService dashboard) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<PatientOverviewDto>> List([FromQuery] string? search, [FromQuery] string? status, CancellationToken ct) =>
        patients.ListAsync(search, status, ct);

    [HttpGet("{id:guid}")]
    public Task<PatientDto> Get(Guid id, CancellationToken ct) => patients.GetAsync(id, ct);

    [HttpPost]
    public async Task<ActionResult<PatientDto>> Create(PatientInput input, CancellationToken ct)
    {
        var dto = await patients.CreateAsync(input, ct);
        return CreatedAtAction(nameof(Get), new { id = dto.Id }, dto);
    }

    [HttpPut("{id:guid}")]
    public Task<PatientDto> Update(Guid id, PatientInput input, CancellationToken ct) => patients.UpdateAsync(id, input, ct);

    [HttpPut("{id:guid}/status")]
    public Task<PatientDto> SetStatus(Guid id, PatientStatusInput input, CancellationToken ct) =>
        patients.SetStatusAsync(id, input.Status, ct);

    /// <summary>Envia o convite do app por e-mail (Supabase Auth).</summary>
    [HttpPost("{id:guid}/invite")]
    public async Task<IActionResult> Invite(Guid id, CancellationToken ct)
    {
        await patients.InviteAsync(id, ct);
        return NoContent();
    }

    // ---- Consultas
    [HttpGet("{id:guid}/consultations")]
    public Task<IReadOnlyList<ConsultationDto>> Consultations(Guid id, CancellationToken ct) => consultations.ListAsync(id, ct);

    [HttpPost("{id:guid}/consultations")]
    public Task<ConsultationDto> Schedule(Guid id, ScheduleConsultationInput input, CancellationToken ct) =>
        consultations.ScheduleAsync(id, input, ct);

    // ---- Planos alimentares
    [HttpGet("{id:guid}/meal-plans")]
    public Task<IReadOnlyList<MealPlanSummaryDto>> MealPlans(Guid id, CancellationToken ct) => mealPlans.ListAsync(id, ct);

    [HttpPost("{id:guid}/meal-plans")]
    public Task<MealPlanDto> CreateMealPlan(Guid id, MealPlanInput input, CancellationToken ct) =>
        mealPlans.CreateAsync(id, input, ct);

    // ---- Exames
    [HttpGet("{id:guid}/exams")]
    public Task<IReadOnlyList<ExamPanelDto>> Exams(Guid id, CancellationToken ct) => exams.ListAsync(id, ct);

    [HttpPost("{id:guid}/exams")]
    public Task<ExamPanelDto> CreateExam(Guid id, ExamPanelInput input, CancellationToken ct) => exams.CreateAsync(id, input, ct);

    // ---- Check-ins, evolução, recados
    [HttpGet("{id:guid}/check-ins")]
    public Task<IReadOnlyList<CheckInDto>> CheckIns(Guid id, CancellationToken ct) => checkIns.ListAsync(id, ct);

    [HttpGet("{id:guid}/progress")]
    public Task<ProgressDto> Progress(Guid id, CancellationToken ct) => dashboard.ProgressAsync(id, ct);

    [HttpGet("{id:guid}/report")]
    public Task<MonthlyReportDto> Report(Guid id, [FromQuery] DateOnly? month, CancellationToken ct) =>
        dashboard.MonthlyReportAsync(id, month, ct);

    [HttpGet("{id:guid}/notes")]
    public Task<IReadOnlyList<NoteDto>> Notes(Guid id, CancellationToken ct) => notes.ListAsync(id, ct);

    [HttpPost("{id:guid}/notes")]
    public Task<NoteDto> WriteNote(Guid id, NoteInput input, CancellationToken ct) => notes.WriteAsync(id, input, ct);
}
