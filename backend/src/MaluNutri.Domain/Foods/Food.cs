namespace MaluNutri.Domain.Foods;

public class Food
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = default!;
    public string FoodGroup { get; private set; } = default!;
    public decimal Kcal100g { get; private set; }
    public decimal Carb100g { get; private set; }
    public decimal Protein100g { get; private set; }
    public decimal Fat100g { get; private set; }
    public string? HouseholdUnit { get; private set; }
    public decimal? HouseholdGrams { get; private set; }

    private Food() { }
}
