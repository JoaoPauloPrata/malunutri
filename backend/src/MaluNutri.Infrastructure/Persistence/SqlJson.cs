using System.Data;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;

namespace MaluNutri.Infrastructure.Persistence;

/// <summary>
/// Executa funções SQL que devolvem jsonb e desserializa o resultado.
/// Usa a mesma conexão/transação do DbContext.
/// </summary>
internal static class SqlJson
{
    private static readonly JsonSerializerOptions Camel = new(JsonSerializerDefaults.Web);
    private static readonly JsonSerializerOptions Snake = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    public static async Task<string?> QueryAsync(NutriDbContext db, string sql, CancellationToken ct,
                                                 params (string Name, object? Value)[] args)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        var opened = conn.State != ConnectionState.Open;
        if (opened) await conn.OpenAsync(ct);
        try
        {
            await using var cmd = new NpgsqlCommand(sql, conn);
            if (db.Database.CurrentTransaction?.GetDbTransaction() is NpgsqlTransaction tx) cmd.Transaction = tx;
            foreach (var (name, value) in args) cmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
            var result = await cmd.ExecuteScalarAsync(ct);
            return result as string ?? result?.ToString();
        }
        finally
        {
            if (opened) await conn.CloseAsync();
        }
    }

    public static T Deserialize<T>(string? json, bool snakeCase = false) =>
        JsonSerializer.Deserialize<T>(json ?? "null", snakeCase ? Snake : Camel)
        ?? throw new InvalidOperationException($"Resposta vazia do banco para {typeof(T).Name}.");
}
