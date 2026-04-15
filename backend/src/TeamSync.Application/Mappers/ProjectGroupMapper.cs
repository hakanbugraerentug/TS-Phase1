using TeamSync.Application.DTOs;
using TeamSync.Domain.Entities;

namespace TeamSync.Application.CQRS.ProjectGroup.Queries.GetAllProjectGroups;

/// <summary>
/// TeamSync.Application/Mappers/ProjectGroupMapper.cs dosyasına taşıyın.
/// Diğer Mapper'larla (ProjectMapper, TeamMapper) aynı klasörde olmalı.
/// </summary>
public static class ProjectGroupMapper
{
    public static ProjectGroupDto ToDto(Domain.Entities.ProjectGroup group) => new()
    {
        Id         = group.Id,
        Name       = group.Name,
        Color      = group.Color,
        ProjectIds = group.ProjectIds,
        CreatedBy  = group.CreatedBy,
        CreatedAt  = group.CreatedAt
    };
}