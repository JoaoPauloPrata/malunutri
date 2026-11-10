using System.Globalization;
using MaluNutri.Application.Abstractions;
using MaluNutri.Application.Common;
using MaluNutri.Application.Dtos;
using MaluNutri.Domain.Common;
using MaluNutri.Domain.MealPlans;

namespace MaluNutri.Application.Services;

public sealed class MealPlanService(
    AccessService access, IMealPlanRepository plans, IClock clock, IUnitOfWork uow)
{
    public async Task<IReadOnlyList<MealPlanSummaryDto>> ListAsync(Guid patientId, CancellationToken ct)
    {
        await access.RequireOwnedPatientAsync(patientId, ct);
        return (await plans.ListByPatientAsync(patientId, ct)).Select(p => p.ToSummary()).ToList();
    }

    public async Task<MealPlanDto> GetAsync(Guid id, CancellationToken ct) => (await LoadOwnedAsync(id, ct)).ToDto();

    /// <summary>Plano ativo do paciente logado (app).</summary>
    public async Task<MealPlanDto?> GetMyActiveAsync(CancellationToken ct)
    {
        var me = await access.RequireSelfPatientAsync(ct);
        return (await plans.GetActiveAsync(me.Id, ct))?.ToDto();
    }

    public async Task<MealPlanDto> CreateAsync(Guid patientId, MealPlanInput input, CancellationToken ct)
    {
        await access.RequireOwnedPatientAsync(patientId, ct);
        var plan = MealPlan.CreateDraft(patientId, input.Title, input.Notes);
        plan.ReplaceItems(ToItems(input));
        plans.Add(plan);
        await uow.SaveChangesAsync(ct);
        return (await plans.GetAsync(plan.Id, ct))!.ToDto();
    }

    public async Task<MealPlanDto> UpdateAsync(Guid id, MealPlanInput input, CancellationToken ct)
    {
        var plan = await LoadOwnedAsync(id, ct);
        plan.Rename(input.Title, input.Notes);
        plan.ReplaceItems(ToItems(input));
        await uow.SaveChangesAsync(ct);
        return (await plans.GetAsync(plan.Id, ct))!.ToDto();
    }

    /// <summary>"Enviar pro app": arquiva o plano ativo anterior e ativa este (mesma transação).</summary>
    public async Task<MealPlanDto> PublishAsync(Guid id, CancellationToken ct)
    {
        var plan = await LoadOwnedAsync(id, ct);
        await uow.ExecuteInTransactionAsync(async () =>
        {
            var current = await plans.GetActiveAsync(plan.PatientId, ct);
            if (current is not null && current.Id != plan.Id)
            {
                current.Archive();
                await uow.SaveChangesAsync(ct); // libera o índice único parcial antes de ativar o novo
            }
            plan.Publish(clock.UtcNow);
            await uow.SaveChangesAsync(ct);
        }, ct);
        return plan.ToDto();
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var plan = await LoadOwnedAsync(id, ct);
        if (plan.Status == MealPlanStatus.Active)
            throw new DomainException("Não é possível excluir o plano ativo. Envie outro plano antes.");
        plans.Remove(plan);
        await uow.SaveChangesAsync(ct);
    }

    private async Task<MealPlan> LoadOwnedAsync(Guid id, CancellationToken ct)
    {
        var plan = await plans.GetAsync(id, ct) ?? throw new NotFoundException("Plano não encontrado.");
        await access.RequireOwnedPatientAsync(plan.PatientId, ct);
        return plan;
    }

    private static IEnumerable<MealPlanItemData> ToItems(MealPlanInput input) =>
        input.Items.Select(i => new MealPlanItemData(
            i.Meal,
            TimeOnly.TryParseExact(i.MealTime, ["HH:mm", "H:mm", "HH:mm:ss"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var t)
                ? t
                : throw new DomainException($"Horário inválido: {i.MealTime}."),
            i.Description, i.Tip, i.ProteinG,
            (i.Foods ?? []).Select(f => new MealPlanItemFoodData(f.FoodId, f.Grams)).ToList()));
}
