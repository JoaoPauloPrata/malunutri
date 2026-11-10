using MaluNutri.Application.Abstractions;
using MaluNutri.Infrastructure.Persistence;
using MaluNutri.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MaluNutri.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var connectionString = config.GetConnectionString("Default")
            ?? throw new InvalidOperationException("ConnectionStrings:Default não configurada.");

        services.AddDbContext<NutriDbContext>(o => o
            .UseNpgsql(connectionString)
            .UseSnakeCaseNamingConvention());

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IProfileRepository, ProfileRepository>();
        services.AddScoped<IPatientRepository, PatientRepository>();
        services.AddScoped<IConsultationRepository, ConsultationRepository>();
        services.AddScoped<IMealPlanRepository, MealPlanRepository>();
        services.AddScoped<IExamRepository, ExamRepository>();
        services.AddScoped<ICheckInRepository, CheckInRepository>();
        services.AddScoped<INoteRepository, NoteRepository>();
        services.AddScoped<IDailyLogRepository, DailyLogRepository>();
        services.AddScoped<IReadQueries, ReadQueries>();

        services.Configure<SupabaseOptions>(config.GetSection(SupabaseOptions.Section));
        services.Configure<AiOptions>(config.GetSection(AiOptions.Section));
        services.AddHttpClient<IAuthAdmin, SupabaseAuthAdmin>(c => c.Timeout = TimeSpan.FromSeconds(15));
        services.AddSingleton<ITranscriptAnalyzer, ClaudeTranscriptAnalyzer>();
        services.AddSingleton<IClock, SaoPauloClock>();

        return services;
    }
}
