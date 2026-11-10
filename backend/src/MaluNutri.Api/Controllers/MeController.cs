using MaluNutri.Application.Dtos;
using MaluNutri.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MaluNutri.Api.Controllers;

/// <summary>Conta logada + app do paciente.</summary>
[ApiController, Authorize, Route("api/me")]
public sealed class MeController(
    AccessService access, DashboardService dashboard, MealPlanService mealPlans,
    CheckInService checkIns, NoteService notes) : ControllerBase
{
    [HttpGet]
    public Task<MeDto> Me(CancellationToken ct) => access.MeAsync(ct);

    [HttpGet("today")]
    public Task<PatientTodayDto> Today(CancellationToken ct) => dashboard.PatientTodayAsync(ct);

    [HttpGet("meal-plan")]
    public async Task<ActionResult<MealPlanDto>> MealPlan(CancellationToken ct) =>
        await mealPlans.GetMyActiveAsync(ct) is { } plan ? plan : NoContent();

    [HttpPost("daily-log")]
    public Task<DailyLogDto> DailyLog(DailyLogInput input, CancellationToken ct) => dashboard.AddDailyLogAsync(input, ct);

    [HttpGet("check-ins")]
    public Task<IReadOnlyList<CheckInDto>> CheckIns(CancellationToken ct) => checkIns.ListMineAsync(ct);

    [HttpPost("check-ins")]
    public Task<CheckInDto> SubmitCheckIn(CheckInInput input, CancellationToken ct) => checkIns.SubmitAsync(input, ct);

    [HttpGet("progress")]
    public Task<ProgressDto> Progress(CancellationToken ct) => dashboard.MyProgressAsync(ct);

    [HttpGet("notes")]
    public Task<IReadOnlyList<NoteDto>> Notes(CancellationToken ct) => notes.ListMineAsync(ct);
}
