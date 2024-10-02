using MongoDB.Bson;
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
            var reports = await _reports.Find(report => report.DeletedAt == null).ToListAsync();
            Console.WriteLine($"Retrieved {reports.Count} reports from the database.");
            return reports;
        }

        public async Task<ReportItem> GetReportByIdAsync(string id)
        {
            return await _reports.Find(report => report.Id == new ObjectId(id) && report.DeletedAt == null).FirstOrDefaultAsync();
        }

        public async Task CreateReportAsync(ReportItem report)
        {
            report.CreatedAt = DateTime.UtcNow;
            report.DeletedAt = null; // Set DeletedAt to null on creation
            await _reports.InsertOneAsync(report);
        }

        public async Task UpdateReportStatusAsync(string id, string status)
        {
            var update = Builders<ReportItem>.Update.Set(r => r.Status, status);
            await _reports.UpdateOneAsync(r => r.Id == new ObjectId(id), update);
        }

        public async Task SoftDeleteReportAsync(string id)
        {
            var update = Builders<ReportItem>.Update.Set(r => r.DeletedAt, DateTime.UtcNow);
            await _reports.UpdateOneAsync(r => r.Id == new ObjectId(id), update);
        }

        public async Task MarkAsImportantAsync(string id)
        {
            var update = Builders<ReportItem>.Update.Set(r => r.IsImportant, true);
            await _reports.UpdateOneAsync(r => r.Id == new ObjectId(id), update);
        }

        public async Task MarkAsCompletedAsync(string id)
        {
            var update = Builders<ReportItem>.Update.Set(r => r.Status, "Completed");
            await _reports.UpdateOneAsync(r => r.Id == new ObjectId(id), update);
        }
    }
}
