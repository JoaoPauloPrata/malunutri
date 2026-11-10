using MaluNutri.Application.Abstractions;

namespace MaluNutri.Infrastructure.Services;

internal sealed class SaoPauloClock : IClock
{
    private static readonly TimeZoneInfo Tz = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
    private DateTime Local => TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, Tz).DateTime;
    public DateOnly Today => DateOnly.FromDateTime(Local);
    public TimeOnly LocalTime => TimeOnly.FromDateTime(Local);
}
