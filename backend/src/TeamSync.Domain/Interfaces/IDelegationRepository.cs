using TeamSync.Domain.Entities;

namespace TeamSync.Domain.Interfaces;

public interface IDelegationRepository
{
    Task<Delegation> CreateAsync(Delegation delegation);
    Task<List<Delegation>> GetByDelegatorAsync(string delegatorUsername);
    Task<List<Delegation>> GetActiveDelegationsForDelegateAsync(string delegateUsername);
    Task<List<Delegation>> GetActiveDelegationsByDelegatorAsync(string delegatorUsername);
    Task<bool> RevokeAsync(string id, string delegatorUsername);
}
