namespace MaluNutri.Application.Common;

public sealed class NotFoundException(string message = "Registro não encontrado.") : Exception(message);

public sealed class ForbiddenException(string message = "Acesso negado.") : Exception(message);

public sealed class UnauthorizedException(string message = "Faça login para continuar.") : Exception(message);

public sealed class ConflictException(string message) : Exception(message);

/// <summary>Falha numa integração externa (Supabase Auth, IA). A API traduz para HTTP 502.</summary>
public sealed class ExternalServiceException(string message, Exception? inner = null) : Exception(message, inner);
