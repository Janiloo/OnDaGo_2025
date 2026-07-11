using MongoDB.Driver;
using OnDaGo.API.Models;
using OnDaGo.API.Tenancy;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace OnDaGo.API.Services
{
    /// <summary>
    /// Reports are company-owned, so writes and company-admin reads go through
    /// <see cref="TenantCollection{T}"/> — the company filter is applied
    /// automatically and cannot be forgotten. The platform SuperAdmin reads
    /// across every company (including commuter-filed reports that carry no
    /// company) via the raw collection, so nothing is ever orphaned.
    /// </summary>
    public class ReportService
    {
        private readonly TenantCollection<ReportItem> _reports;
        private readonly IMongoCollection<ReportItem> _raw;
        private readonly TenantContext _tenant;

        public ReportService(TenantCollection<ReportItem> reports, IMongoDatabase db, TenantContext tenant)
        {
            _reports = reports;
            _raw = db.GetCollection<ReportItem>("reports");
            _tenant = tenant;
        }

        private static FilterDefinition<ReportItem> Active(string? id = null)
        {
            var notDeleted = Builders<ReportItem>.Filter.Eq(r => r.DeletedAt, null);
            return id == null
                ? notDeleted
                : Builders<ReportItem>.Filter.And(Builders<ReportItem>.Filter.Eq(r => r.Id, id), notDeleted);
        }

        // Platform SuperAdmin: read every company's reports plus unattributed
        // (commuter) ones. Company admin: only their own company's, via scoping.
        public Task<List<ReportItem>> GetReportsAsync() =>
            _tenant.IsPlatformAdmin
                ? _raw.Find(Active()).ToListAsync()
                : _reports.FindAsync(Active());

        public Task<ReportItem> GetReportByIdAsync(string id) =>
            _tenant.IsPlatformAdmin
                ? _raw.Find(Active(id)).FirstOrDefaultAsync()
                : _reports.FindOneAsync(Active(id));

        public Task CreateReportAsync(ReportItem report)
        {
            report.CreatedAt = DateTime.UtcNow;
            report.DeletedAt = null;
            return _reports.InsertAsync(report); // stamps CompanyId
        }

        /// <summary>
        /// Submit a report against an EXPLICIT company (the bus company a commuter
        /// selected, or a driver's own). Writes through the raw collection so the
        /// caller-company auto-stamp of <see cref="TenantCollection{T}"/> does not
        /// overwrite it — a commuter has no company of their own, and a report must
        /// be attributed to the operator it concerns. Reads stay scoped, so tenant
        /// isolation (the security guarantee) is unaffected: a company admin only
        /// ever sees reports whose CompanyId equals theirs.
        /// </summary>
        public Task SubmitAsync(ReportItem report)
        {
            report.CreatedAt = DateTime.UtcNow;
            report.DeletedAt = null;
            return _raw.InsertOneAsync(report);
        }

        public Task<ReportItem?> UpdateReportStatusAsync(string id, string status)
        {
            var update = Builders<ReportItem>.Update.Set(r => r.Status, status);
            update = status == "Completed"
                ? update.Set(r => r.CompletedAt, DateTime.UtcNow)
                : update.Set(r => r.CompletedAt, (DateTime?)null);
            return _reports.FindOneAndUpdateAsync(Active(id), update);
        }

        public Task<ReportItem?> SetImportantAsync(string id, bool important) =>
            _reports.FindOneAndUpdateAsync(Active(id), Builders<ReportItem>.Update.Set(r => r.IsImportant, important));

        public Task<ReportItem?> MarkAsCompletedAsync(string id)
        {
            var update = Builders<ReportItem>.Update
                .Set(r => r.Status, "Completed")
                .Set(r => r.CompletedAt, DateTime.UtcNow);
            return _reports.FindOneAndUpdateAsync(Active(id), update);
        }

        public async Task<bool> SoftDeleteReportAsync(string id)
        {
            var result = await _reports.UpdateOneAsync(
                Active(id), Builders<ReportItem>.Update.Set(r => r.DeletedAt, DateTime.UtcNow));
            return result.ModifiedCount > 0;
        }
    }
}
