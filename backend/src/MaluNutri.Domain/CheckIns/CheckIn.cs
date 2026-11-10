using MaluNutri.Domain.Common;

namespace MaluNutri.Domain.CheckIns;

public static class CheckInOptions
{
    public static readonly string[] Hunger = ["pouca", "na_medida", "muita_a_noite"];
    public static readonly string[] Sleep = ["bem", "mais_ou_menos", "mal"];
    public static readonly string[] Hardest = ["cafe_da_manha", "almoco", "lanche_da_tarde", "jantar", "fim_de_semana", "agua"];
}

public class CheckIn
{
    public Guid Id { get; private set; }
    public Guid PatientId { get; private set; }
    public DateOnly WeekStart { get; private set; }
    public short Adherence { get; private set; }
    public string Hunger { get; private set; } = default!;
    public string Sleep { get; private set; } = default!;
    public string[] Hardest { get; private set; } = [];
    public decimal? WeightKg { get; private set; }
    public decimal? WaistCm { get; private set; }
    public string? Comment { get; private set; }
    public DateTimeOffset? ReviewedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private CheckIn() { }

    /// <summary>Segunda-feira da semana (mesma regra do trigger no banco).</summary>
    public static DateOnly WeekOf(DateOnly day) => day.AddDays(-(((int)day.DayOfWeek + 6) % 7));

    public static CheckIn Submit(Guid patientId, DateOnly today, CheckInData d, DateTimeOffset now)
    {
        var c = new CheckIn { Id = Guid.NewGuid(), PatientId = patientId, WeekStart = WeekOf(today), CreatedAt = now };
        c.Apply(d);
        return c;
    }

    /// <summary>Reenvio na mesma semana sobrescreve as respostas e volta a ficar pendente.</summary>
    public void Apply(CheckInData d)
    {
        if (d.Adherence is < 1 or > 5) throw new DomainException("Adesão deve ser de 1 a 5.");
        Adherence = d.Adherence;
        Hunger = Guard.OneOf(d.Hunger, "Fome", CheckInOptions.Hunger);
        Sleep = Guard.OneOf(d.Sleep, "Sono", CheckInOptions.Sleep);
        Hardest = d.Hardest.Distinct().Select(h => Guard.OneOf(h, "O que foi mais difícil", CheckInOptions.Hardest)).ToArray();
        WeightKg = Guard.Range(d.WeightKg, "Peso", 20, 400);
        WaistCm = Guard.Range(d.WaistCm, "Cintura", 30, 250);
        Comment = Guard.Optional(d.Comment, "Comentário", 1000);
        ReviewedAt = null;
    }

    public void MarkReviewed(DateTimeOffset now) => ReviewedAt ??= now;
}

public sealed record CheckInData(short Adherence, string Hunger, string Sleep, string[] Hardest,
                                 decimal? WeightKg, decimal? WaistCm, string? Comment);
