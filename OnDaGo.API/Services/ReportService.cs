using MongoDB.Driver;
using OnDaGo.API.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace OnDaGo.API.Services
{
    public class ReportService
    {
        private readonly IMongoCollection<ReportItem> _reports;

        public ReportService(IMongoDatabase database)
        {
            _reports = database.GetCollection<ReportItem>("reports");
        }

        public async Task<List<ReportItem>> GetReportsAsync()
        {
            return await _reports.Find(report => report.DeletedAt == null).ToListAsync();
        }

        public async Task<ReportItem?> GetReportByIdAsync(string id)
        {
            return await _reports.Find(r => r.Id == id && r.DeletedAt == null).FirstOrDefaultAsync();
        }

        public async Task CreateReportAsync(ReportItem report)
        {
            report.CreatedAt = DateTime.UtcNow;
            report.DeletedAt = null;
            await _reports.InsertOneAsync(report);
        }

        // Applies an update to a non-deleted report and returns the updated
        // document (or null if it wasn't found), so callers can broadcast it.
        private Task<ReportItem?> ApplyUpdateAsync(string id, UpdateDefinition<ReportItem> update)
        {
            var filter = Builders<ReportItem>.Filter.Where(r => r.Id == id && r.DeletedAt == null);
            return _reports.FindOneAndUpdateAsync(
                filter,
                update,
                new FindOneAndUpdateOptions<ReportItem> { ReturnDocument = ReturnDocument.After });
        }

        public Task<ReportItem?> UpdateReportStatusAsync(string id, string status)
        {
            var update = Builders<ReportItem>.Update.Set(r => r.Status, status);
            // Keep CompletedAt consistent with the status.
            update = status == "Completed"
                ? update.Set(r => r.CompletedAt, DateTime.UtcNow)
                : update.Set(r => r.CompletedAt, (DateTime?)null);
            return ApplyUpdateAsync(id, update);
        }

        public Task<ReportItem?> SetImportantAsync(string id, bool important)
        {
            return ApplyUpdateAsync(id, Builders<ReportItem>.Update.Set(r => r.IsImportant, important));
        }

        public Task<ReportItem?> MarkAsCompletedAsync(string id)
        {
            var update = Builders<ReportItem>.Update
                .Set(r => r.Status, "Completed")
                .Set(r => r.CompletedAt, DateTime.UtcNow);
            return ApplyUpdateAsync(id, update);
        }

        // Soft delete: preserves the record for audit/history but hides it from
        // every query (all reads filter DeletedAt == null). Returns false if the
        // report didn't exist / was already deleted.
        public async Task<bool> SoftDeleteReportAsync(string id)
        {
            var update = Builders<ReportItem>.Update.Set(r => r.DeletedAt, DateTime.UtcNow);
            var result = await _reports.UpdateOneAsync(
                r => r.Id == id && r.DeletedAt == null, update);
            return result.ModifiedCount > 0;
        }
    }
}
