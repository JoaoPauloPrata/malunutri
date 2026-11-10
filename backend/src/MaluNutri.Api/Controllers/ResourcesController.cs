using MaluNutri.Application.Dtos;
using MaluNutri.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace MaluNutri.Api.Controllers;

[ApiController, Authorize, Route("api/consultations")]
public sealed class ConsultationsController(ConsultationService consultations) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public Task<ConsultationDto> Get(Guid id, CancellationToken ct) => consultations.GetAsync(id, ct);

    [HttpPut("{id:guid}")]
    public Task<ConsultationDto> Update(Guid id, UpdateConsultationInput input, CancellationToken ct) =>
        consultations.UpdateAsync(id, input, ct);

    /// <summary>Transcrição → prontuário com IA.</summary>
    [HttpPost("{id:guid}/analyze"), EnableRateLimiting("ai")]
    public Task<ConsultationDto> Analyze(Guid id, CancellationToken ct) => consultations.AnalyzeAsync(id, ct);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await consultations.DeleteAsync(id, ct);
        return NoContent();
    }
}

[ApiController, Authorize, Route("api/meal-plans")]
public sealed class MealPlansController(MealPlanService plans) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public Task<MealPlanDto> Get(Guid id, CancellationToken ct) => plans.GetAsync(id, ct);

    [HttpPut("{id:guid}")]
    public Task<MealPlanDto> Update(Guid id, MealPlanInput input, CancellationToken ct) => plans.UpdateAsync(id, input, ct);

    /// <summary>"Enviar pro app".</summary>
    [HttpPost("{id:guid}/publish")]
    public Task<MealPlanDto> Publish(Guid id, CancellationToken ct) => plans.PublishAsync(id, ct);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await plans.DeleteAsync(id, ct);
        return NoContent();
    }
}

[ApiController, Authorize, Route("api/exams")]
public sealed class ExamsController(ExamService exams) : ControllerBase
{
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await exams.DeleteAsync(id, ct);
        return NoContent();
    }
}

[ApiController, Authorize, Route("api/check-ins")]
public sealed class CheckInsController(CheckInService checkIns) : ControllerBase
{
    [HttpPost("{id:guid}/review")]
    public Task<CheckInDto> Review(Guid id, CancellationToken ct) => checkIns.MarkReviewedAsync(id, ct);
}

[ApiController, Authorize, Route("api/dashboard")]
public sealed class DashboardController(DashboardService dashboard) : ControllerBase
{
    [HttpGet("today")]
    public Task<NutritionistTodayDto> Today([FromQuery] DateOnly? day, CancellationToken ct) =>
        dashboard.NutritionistTodayAsync(day, ct);
}

/// <summary>Base de alimentos e balança de substituições (nutricionista e paciente).</summary>
[ApiController, Authorize, Route("api/foods")]
public sealed class FoodsController(DashboardService dashboard) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<FoodDto>> Search([FromQuery] string? q, [FromQuery] string? group, CancellationToken ct) =>
        dashboard.SearchFoodsAsync(q, group, ct);

    [HttpGet("{id:guid}/substitutions")]
    public Task<IReadOnlyList<SubstitutionDto>> Substitutions(Guid id, [FromQuery] decimal grams, CancellationToken ct) =>
        dashboard.SubstitutionsAsync(id, grams, ct);
}
