using MaluNutri.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace MaluNutri.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<AccessService>();
        services.AddScoped<PatientService>();
        services.AddScoped<ConsultationService>();
        services.AddScoped<MealPlanService>();
        services.AddScoped<ExamService>();
        services.AddScoped<CheckInService>();
        services.AddScoped<NoteService>();
        services.AddScoped<DashboardService>();
        return services;
    }
}
