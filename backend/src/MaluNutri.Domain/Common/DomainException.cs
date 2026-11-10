namespace MaluNutri.Domain.Common;

/// <summary>Violação de regra de negócio. A API traduz para HTTP 422.</summary>
public sealed class DomainException(string message) : Exception(message);

internal static class Guard
{
    public static string Required(string? value, string field, int max = 500)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainException($"{field} é obrigatório.");
        var trimmed = value.Trim();
        if (trimmed.Length > max)
            throw new DomainException($"{field} deve ter no máximo {max} caracteres.");
        return trimmed;
    }

    public static string? Optional(string? value, string field, int max = 4000)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        if (trimmed.Length > max)
            throw new DomainException($"{field} deve ter no máximo {max} caracteres.");
        return trimmed;
    }

    public static string OneOf(string value, string field, IReadOnlyCollection<string> allowed)
    {
        if (!allowed.Contains(value))
            throw new DomainException($"{field} inválido: \"{value}\".");
        return value;
    }

    public static decimal? Range(decimal? value, string field, decimal min, decimal max)
    {
        if (value is null) return null;
        if (value < min || value > max)
            throw new DomainException($"{field} deve estar entre {min} e {max}.");
        return value;
    }
}
