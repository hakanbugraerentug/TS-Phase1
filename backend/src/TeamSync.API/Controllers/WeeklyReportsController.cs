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
            SavedAt = report.SavedAt,
            Author = report.Author,
            Reviewer = report.Reviewer,
            ReadyToReview = report.ReadyToReview,
            Status = report.Status
        });
    }

    [HttpGet("by-user")]
    public async Task<IActionResult> GetByUser([FromQuery] string username, [FromQuery] string weekStart)
    {
        var requestingUser = User.Identity?.Name;
        if (string.IsNullOrEmpty(requestingUser))
            return Unauthorized();

        if (string.IsNullOrEmpty(username))
            return BadRequest("username is required.");

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
            SavedAt = report.SavedAt,
            Author = report.Author,
            Reviewer = report.Reviewer,
            ReadyToReview = report.ReadyToReview,
            Status = report.Status
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
            SavedAt = DateTime.UtcNow,
            Author = username,
            Date = DateTime.UtcNow,
            Reviewer = request.Reviewer,
            ReadyToReview = request.ReadyToReview,
            Status = request.Status
        };

        var saved = await _repo.UpsertAsync(report);

        return Ok(new WeeklyReportDto
        {
            Id = saved.Id,
            Username = saved.Username,
            WeekStart = saved.WeekStart,
            SavedAt = saved.SavedAt,
            Author = saved.Author,
            Reviewer = saved.Reviewer,
            ReadyToReview = saved.ReadyToReview,
            Status = saved.Status
        });
    }

    [HttpPatch("submit")]
    public async Task<IActionResult> Submit([FromBody] SubmitWeeklyReportRequest request)
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Unauthorized();

        if (string.IsNullOrEmpty(request.WeekStart) || !System.Text.RegularExpressions.Regex.IsMatch(request.WeekStart, @"^\d{4}-\d{2}-\d{2}$"))
            return BadRequest("weekStart must be a valid date in YYYY-MM-DD format.");

        try
        {
            var updated = await _repo.UpdateReadyToReviewAsync(username, request.WeekStart, true);
            return Ok(new WeeklyReportDto
            {
                Id = updated.Id,
                Username = updated.Username,
                WeekStart = updated.WeekStart,
                SavedAt = updated.SavedAt,
                Author = updated.Author,
                Reviewer = updated.Reviewer,
                ReadyToReview = updated.ReadyToReview,
                Status = updated.Status
            });
        }
        catch (InvalidOperationException)
        {
            return NotFound("Report not found for the given week.");
        }
    }

    [HttpGet("inbox")]
    public async Task<IActionResult> Inbox()
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Unauthorized();

        var reports = await _repo.GetReadyToReviewByReviewerAsync(username);
        var dtos = reports.Select(r => new WeeklyReportDto
        {
            Id = r.Id,
            Username = r.Username,
            WeekStart = r.WeekStart,
            SavedAt = r.SavedAt,
            Author = r.Author,
            Reviewer = r.Reviewer,
            ReadyToReview = r.ReadyToReview,
            Status = r.Status
        });
        return Ok(dtos);
    }

    [HttpGet("all-for-reviewer")]
    public async Task<IActionResult> AllForReviewer()
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Unauthorized();

        var reports = await _repo.GetByReviewerAsync(username);
        var dtos = reports.Select(r => new WeeklyReportDto
        {
            Id = r.Id,
            Username = r.Username,
            WeekStart = r.WeekStart,
            SavedAt = r.SavedAt,
            Author = r.Author,
            Reviewer = r.Reviewer,
            ReadyToReview = r.ReadyToReview,
            Status = r.Status
        });
        return Ok(dtos);
    }
}
