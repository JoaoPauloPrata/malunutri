using MaluNutri.Application.Abstractions;
using MaluNutri.Application.Common;
using MaluNutri.Application.Dtos;
using MaluNutri.Domain.Exams;

namespace MaluNutri.Application.Services;

public sealed class ExamService(AccessService access, IExamRepository exams, IUnitOfWork uow)
{
    public async Task<IReadOnlyList<ExamPanelDto>> ListAsync(Guid patientId, CancellationToken ct)
    {
        await access.RequireOwnedPatientAsync(patientId, ct);
        return (await exams.ListByPatientAsync(patientId, ct)).Select(e => e.ToDto()).ToList();
    }

    public async Task<ExamPanelDto> CreateAsync(Guid patientId, ExamPanelInput input, CancellationToken ct)
    {
        await access.RequireOwnedPatientAsync(patientId, ct);
        var panel = ExamPanel.Create(patientId, input.CollectedAt, input.Title, input.AttentionNote,
            input.Results.Select(r => new ExamResultData(r.ExamName, r.Value, r.Unit, r.RefMin, r.RefMax)));
        exams.Add(panel);
        await uow.SaveChangesAsync(ct);
        // recarrega para trazer o status calculado pela coluna gerada
        return (await exams.GetAsync(panel.Id, ct))!.ToDto();
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var panel = await exams.GetAsync(id, ct) ?? throw new NotFoundException("Exame não encontrado.");
        await access.RequireOwnedPatientAsync(panel.PatientId, ct);
        exams.Remove(panel);
        await uow.SaveChangesAsync(ct);
    }
}
