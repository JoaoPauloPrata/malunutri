using MaluNutri.Domain.CheckIns;
using MaluNutri.Domain.Consultations;
using MaluNutri.Domain.Exams;
using MaluNutri.Domain.Foods;
using MaluNutri.Domain.MealPlans;
using MaluNutri.Domain.Notes;
using MaluNutri.Domain.Patients;
using MaluNutri.Domain.Profiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MaluNutri.Infrastructure.Persistence;

/// <summary>
/// O schema é versionado em supabase/migrations (SQL). Aqui só mapeamos as tabelas existentes —
/// não usamos migrations do EF.
/// </summary>
public sealed class NutriDbContext(DbContextOptions<NutriDbContext> options) : DbContext(options)
{
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Consultation> Consultations => Set<Consultation>();
    public DbSet<Food> Foods => Set<Food>();
    public DbSet<MealPlan> MealPlans => Set<MealPlan>();
    public DbSet<MealPlanItem> MealPlanItems => Set<MealPlanItem>();
    public DbSet<ExamPanel> ExamPanels => Set<ExamPanel>();
    public DbSet<CheckIn> CheckIns => Set<CheckIn>();
    public DbSet<Note> Notes => Set<Note>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.HasDefaultSchema("nutri");

        b.Entity<Profile>(e =>
        {
            e.ToTable("profiles");
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.CreatedAt).ValueGeneratedOnAdd();
            e.Ignore(x => x.IsNutritionist);
            e.Ignore(x => x.IsPatient);
        });

        b.Entity<Patient>(e =>
        {
            e.ToTable("patients");
            e.Property(x => x.Id).ValueGeneratedNever();
            Timestamps(e);
        });

        b.Entity<Consultation>(e =>
        {
            e.ToTable("consultations");
            e.Property(x => x.Id).ValueGeneratedNever();
            Timestamps(e);
        });

        b.Entity<Food>(e =>
        {
            e.ToTable("foods");
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.Kcal100g).HasColumnName("kcal_100g");
            e.Property(x => x.Carb100g).HasColumnName("carb_100g");
            e.Property(x => x.Protein100g).HasColumnName("protein_100g");
            e.Property(x => x.Fat100g).HasColumnName("fat_100g");
            e.Property<string>("SearchName").ValueGeneratedOnAddOrUpdate(); // coluna gerada (sem acentos)
        });

        b.Entity<PatientOverviewRow>(e => e.ToView("v_patient_overview").HasNoKey());

        b.Entity<MealPlan>(e =>
        {
            e.ToTable("meal_plans");
            e.Property(x => x.Id).ValueGeneratedNever();
            Timestamps(e);
            e.HasMany(x => x.Items).WithOne().HasForeignKey(i => i.MealPlanId).OnDelete(DeleteBehavior.Cascade);
            e.Navigation(x => x.Items).HasField("_items").UsePropertyAccessMode(PropertyAccessMode.Field);
        });

        b.Entity<MealPlanItem>(e =>
        {
            e.ToTable("meal_plan_items");
            e.Property(x => x.Id).ValueGeneratedNever();
            e.HasMany(x => x.Foods).WithOne().HasForeignKey(f => f.MealPlanItemId).OnDelete(DeleteBehavior.Cascade);
            e.Navigation(x => x.Foods).HasField("_foods").UsePropertyAccessMode(PropertyAccessMode.Field);
        });

        b.Entity<MealPlanItemFood>(e =>
        {
            e.ToTable("meal_plan_item_foods");
            e.Property(x => x.Id).ValueGeneratedNever();
            e.HasOne(x => x.Food).WithMany().HasForeignKey(x => x.FoodId);
        });

        b.Entity<ExamPanel>(e =>
        {
            e.ToTable("exam_panels");
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.CreatedAt).ValueGeneratedOnAdd();
            e.HasMany(x => x.Results).WithOne().HasForeignKey(r => r.PanelId).OnDelete(DeleteBehavior.Cascade);
            e.Navigation(x => x.Results).HasField("_results").UsePropertyAccessMode(PropertyAccessMode.Field);
        });

        b.Entity<ExamResult>(e =>
        {
            e.ToTable("exam_results");
            e.Property(x => x.Id).ValueGeneratedNever();
            // coluna GENERATED ALWAYS no Postgres
            var status = e.Property(x => x.Status).ValueGeneratedOnAddOrUpdate().Metadata;
            status.SetBeforeSaveBehavior(Microsoft.EntityFrameworkCore.Metadata.PropertySaveBehavior.Ignore);
            status.SetAfterSaveBehavior(Microsoft.EntityFrameworkCore.Metadata.PropertySaveBehavior.Ignore);
        });

        b.Entity<CheckIn>(e =>
        {
            e.ToTable("check_ins");
            e.Property(x => x.Id).ValueGeneratedNever();
        });

        b.Entity<Note>(e =>
        {
            e.ToTable("notes");
            e.Property(x => x.Id).ValueGeneratedNever();
        });
    }

    /// <summary>created_at tem default now() e updated_at é mantido por trigger.</summary>
    private static void Timestamps<T>(EntityTypeBuilder<T> e) where T : class
    {
        e.Property<DateTimeOffset>("CreatedAt").ValueGeneratedOnAdd();
        e.Property<DateTimeOffset>("UpdatedAt").ValueGeneratedOnAddOrUpdate();
    }
}
