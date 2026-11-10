using MaluNutri.Application.Abstractions;
using MaluNutri.Application.Common;
using MaluNutri.Application.Dtos;
using MaluNutri.Domain.Notes;

namespace MaluNutri.Application.Services;

public sealed class NoteService(AccessService access, INoteRepository notes, IClock clock, IUnitOfWork uow)
{
    public async Task<IReadOnlyList<NoteDto>> ListAsync(Guid patientId, CancellationToken ct)
    {
        await access.RequireOwnedPatientAsync(patientId, ct);
        return (await notes.ListByPatientAsync(patientId, 50, ct)).Select(n => n.ToDto()).ToList();
    }

    public async Task<NoteDto> WriteAsync(Guid patientId, NoteInput input, CancellationToken ct)
    {
        await access.RequireOwnedPatientAsync(patientId, ct);
        var note = Note.Write(patientId, input.Body, clock.UtcNow);
        notes.Add(note);
        await uow.SaveChangesAsync(ct);
        return note.ToDto();
    }

    /// <summary>Recados do paciente logado; abrir a lista marca todos como lidos.</summary>
    public async Task<IReadOnlyList<NoteDto>> ListMineAsync(CancellationToken ct)
    {
        var me = await access.RequireSelfPatientAsync(ct);
        var list = (await notes.ListByPatientAsync(me.Id, 50, ct)).Select(n => n.ToDto()).ToList();
        await notes.MarkAllReadAsync(me.Id, clock.UtcNow, ct);
        return list;
    }
}
