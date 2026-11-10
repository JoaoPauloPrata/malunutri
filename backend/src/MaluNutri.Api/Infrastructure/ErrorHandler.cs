using MaluNutri.Application.Common;
using MaluNutri.Domain.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace MaluNutri.Api.Infrastructure;

/// <summary>Traduz exceções de domínio/aplicação em ProblemDetails com mensagens em português.</summary>
internal sealed class ErrorHandler(IProblemDetailsService problems, ILogger<ErrorHandler> log) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        var (status, title) = ex switch
        {
            DomainException => (StatusCodes.Status422UnprocessableEntity, ex.Message),
            NotFoundException => (StatusCodes.Status404NotFound, ex.Message),
            ForbiddenException => (StatusCodes.Status403Forbidden, ex.Message),
            UnauthorizedException => (StatusCodes.Status401Unauthorized, ex.Message),
            ConflictException => (StatusCodes.Status409Conflict, ex.Message),
            ExternalServiceException => (StatusCodes.Status502BadGateway, ex.Message),
            BadHttpRequestException => (StatusCodes.Status400BadRequest, "Requisição inválida."),
            Microsoft.EntityFrameworkCore.DbUpdateException { InnerException: PostgresException { SqlState: "23505" } } =>
                (StatusCodes.Status409Conflict, "Registro duplicado."),
            Microsoft.EntityFrameworkCore.DbUpdateException { InnerException: PostgresException { SqlState: "23514" or "23503" } } =>
                (StatusCodes.Status422UnprocessableEntity, "Dados inválidos."),
            OperationCanceledException when ctx.RequestAborted.IsCancellationRequested => (499, "Requisição cancelada."),
            _ => (StatusCodes.Status500InternalServerError, "Algo deu errado. Tente novamente."),
        };

        if (status >= 500) log.LogError(ex, "Erro não tratado em {Path}", ctx.Request.Path);

        ctx.Response.StatusCode = status;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = ctx,
            Exception = ex,
            ProblemDetails = new ProblemDetails { Status = status, Title = title },
        });
    }
}
