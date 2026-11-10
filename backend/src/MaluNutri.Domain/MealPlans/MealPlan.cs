using MaluNutri.Domain.Common;

namespace MaluNutri.Domain.MealPlans;

public static class MealPlanStatus
{
    public const string Draft = "rascunho";
    public const string Active = "ativo";
    public const string Archived = "arquivado";
}

public static class Meals
{
    public static readonly string[] All = ["cafe", "lanche_manha", "almoco", "lanche_tarde", "jantar", "ceia"];
}

public class MealPlan
{
    private readonly List<MealPlanItem> _items = [];

    public Guid Id { get; private set; }
    public Guid PatientId { get; private set; }
    public string Title { get; private set; } = "Plano alimentar";
    public string Status { get; private set; } = MealPlanStatus.Draft;
    public string? Notes { get; private set; }
    public DateTimeOffset? PublishedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public IReadOnlyCollection<MealPlanItem> Items => _items;

    private MealPlan() { }

    public static MealPlan CreateDraft(Guid patientId, string title, string? notes)
    {
        var plan = new MealPlan { Id = Guid.NewGuid(), PatientId = patientId };
        plan.Rename(title, notes);
        return plan;
    }

    public void Rename(string title, string? notes)
    {
        Title = Guard.Required(title, "Título", 120);
        Notes = Guard.Optional(notes, "Observações");
    }

    /// <summary>Substitui todas as refeições do plano (o editor salva o plano inteiro).</summary>
    public void ReplaceItems(IEnumerable<MealPlanItemData> items)
    {
        if (Status == MealPlanStatus.Archived)
            throw new DomainException("Planos arquivados não podem ser editados.");
        _items.Clear();
        var order = 0;
        foreach (var d in items.OrderBy(i => i.MealTime))
            _items.Add(MealPlanItem.Create(Id, d, order++));
    }

    /// <summary>"Enviar pro app": ativa este plano. O ativo anterior deve ser arquivado antes.</summary>
    public void Publish(DateTimeOffset now)
    {
        if (Status == MealPlanStatus.Archived) throw new DomainException("Plano arquivado não pode ser enviado.");
        if (_items.Count == 0) throw new DomainException("Adicione pelo menos uma refeição antes de enviar o plano.");
        Status = MealPlanStatus.Active;
        PublishedAt = now;
    }

    public void Archive() => Status = MealPlanStatus.Archived;
}

public class MealPlanItem
{
    private readonly List<MealPlanItemFood> _foods = [];

    public Guid Id { get; private set; }
    public Guid MealPlanId { get; private set; }
    public string Meal { get; private set; } = default!;
    public TimeOnly MealTime { get; private set; }
    public string Description { get; private set; } = default!;
    public string? Tip { get; private set; }
    public decimal? ProteinG { get; private set; }
    public int SortOrder { get; private set; }
    public IReadOnlyCollection<MealPlanItemFood> Foods => _foods;

    private MealPlanItem() { }

    internal static MealPlanItem Create(Guid planId, MealPlanItemData d, int order)
    {
        var item = new MealPlanItem
        {
            Id = Guid.NewGuid(),
            MealPlanId = planId,
            Meal = Guard.OneOf(d.Meal, "Refeição", Meals.All),
            MealTime = d.MealTime,
            Description = Guard.Required(d.Description, "Descrição da refeição", 1000),
            Tip = Guard.Optional(d.Tip, "Dica", 200),
            ProteinG = Guard.Range(d.ProteinG, "Proteína", 0, 200),
            SortOrder = order,
        };
        foreach (var f in d.Foods)
        {
            if (f.Grams is <= 0 or > 2000) throw new DomainException("Quantidade do alimento inválida.");
            item._foods.Add(new MealPlanItemFood(Guid.NewGuid(), item.Id, f.FoodId, f.Grams));
        }
        return item;
    }
}

public class MealPlanItemFood
{
    public Guid Id { get; private set; }
    public Guid MealPlanItemId { get; private set; }
    public Guid FoodId { get; private set; }
    public decimal Grams { get; private set; }
    public Foods.Food? Food { get; private set; }

    private MealPlanItemFood() { }

    internal MealPlanItemFood(Guid id, Guid itemId, Guid foodId, decimal grams)
    {
        Id = id; MealPlanItemId = itemId; FoodId = foodId; Grams = grams;
    }
}

public sealed record MealPlanItemData(
    string Meal, TimeOnly MealTime, string Description, string? Tip, decimal? ProteinG,
    IReadOnlyList<MealPlanItemFoodData> Foods);

public sealed record MealPlanItemFoodData(Guid FoodId, decimal Grams);
