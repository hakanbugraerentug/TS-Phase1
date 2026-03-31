using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using TeamSync.Application.DTOs;
using TeamSync.Domain.Entities;
using TeamSync.Domain.Interfaces;

namespace TeamSync.API.Controllers;

[ApiController]
[Route("api/weekly-reports")]
[Authorize]
public class WeeklyReportsController : ControllerBase
{
    private readonly IWeeklyReportRepository _repo;

    public WeeklyReportsController(IWeeklyReportRepository repo)
    {
        _repo = repo;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string weekStart)
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Unauthorized();

        if (string.IsNullOrEmpty(weekStart) || !System.Text.RegularExpressions.Regex.IsMatch(weekStart, @"^\d{4}-\d{2}-\d{2}$"))
            return BadRequest("weekStart must be a valid date in YYYY-MM-DD format.");

        var report = await _repo.GetByUsernameAndWeekAsync(username, weekStart);
        if (report == null) return NotFound();

        var reportDataJson = report.ReportData != null
            ? BsonTypeMapper.MapToDotNetValue(report.ReportData)
            : null;

        return Ok(new WeeklyReportDto
        {
            Id = report.Id,
            Username = report.Username,
            WeekStart = report.WeekStart,
            ReportData = reportDataJson,
            SavedAt = report.SavedAt
        });
    }

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveWeeklyReportRequest request)
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Unauthorized();

        if (string.IsNullOrEmpty(request.WeekStart) || !System.Text.RegularExpressions.Regex.IsMatch(request.WeekStart, @"^\d{4}-\d{2}-\d{2}$"))
            return BadRequest("weekStart must be a valid date in YYYY-MM-DD format.");

        BsonDocument bsonDoc;
        try
        {
            var json = request.ReportData.GetRawText();
            bsonDoc = BsonDocument.Parse(json);
        }
        catch (Exception)
        {
            return BadRequest("reportData contains invalid JSON.");
        }

        var report = new WeeklyReport
        {
            Username = username,
            WeekStart = request.WeekStart,
            ReportData = bsonDoc,
            SavedAt = DateTime.UtcNow
        };

        var saved = await _repo.UpsertAsync(report);

        return Ok(new WeeklyReportDto
        {
            Id = saved.Id,
            Username = saved.Username,
            WeekStart = saved.WeekStart,
            SavedAt = saved.SavedAt
        });
    }
}
