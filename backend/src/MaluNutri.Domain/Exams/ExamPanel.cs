using MaluNutri.Domain.Common;

namespace MaluNutri.Domain.Exams;

public class ExamPanel
{
    private readonly List<ExamResult> _results = [];

    public Guid Id { get; private set; }
    public Guid PatientId { get; private set; }
    public DateOnly CollectedAt { get; private set; }
    public string Title { get; private set; } = "Exames laboratoriais";
    public string? AttentionNote { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public IReadOnlyCollection<ExamResult> Results => _results;

    private ExamPanel() { }

    public static ExamPanel Create(Guid patientId, DateOnly collectedAt, string title, string? note,
                                   IEnumerable<ExamResultData> results)
    {
        var panel = new ExamPanel
        {
            Id = Guid.NewGuid(),
            PatientId = patientId,
            CollectedAt = collectedAt,
            Title = Guard.Required(title, "Título", 120),
            AttentionNote = Guard.Optional(note, "Observação", 2000),
        };
        foreach (var r in results) panel._results.Add(ExamResult.Create(panel.Id, r));
        if (panel._results.Count == 0) throw new DomainException("Informe pelo menos um resultado.");
        return panel;
    }
}

public class ExamResult
{
    public Guid Id { get; private set; }
    public Guid PanelId { get; private set; }
    public string ExamName { get; private set; } = default!;
    public decimal Value { get; private set; }
    public string Unit { get; private set; } = default!;
    public decimal? RefMin { get; private set; }
    public decimal? RefMax { get; private set; }
    /// <summary>Coluna gerada no Postgres: baixo | normal | alto.</summary>
    public string Status { get; private set; } = "normal";

    private ExamResult() { }

    internal static ExamResult Create(Guid panelId, ExamResultData d)
    {
        if (d.RefMin is not null && d.RefMax is not null && d.RefMin > d.RefMax)
            throw new DomainException($"Faixa de referência inválida em {d.ExamName}.");
        return new ExamResult
        {
            Id = Guid.NewGuid(),
            PanelId = panelId,
            ExamName = Guard.Required(d.ExamName, "Exame", 120),
            Value = d.Value,
            Unit = Guard.Required(d.Unit, "Unidade", 30),
            RefMin = d.RefMin,
            RefMax = d.RefMax,
        };
    }
}

public sealed record ExamResultData(string ExamName, decimal Value, string Unit, decimal? RefMin, decimal? RefMax);
