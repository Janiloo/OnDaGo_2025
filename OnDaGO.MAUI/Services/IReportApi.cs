using Refit;
using OnDaGO.MAUI.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace OnDaGO.MAUI.Services
{
    public interface IReportApi
    {
        [Get("/api/reports")]
        Task<List<ReportItem>> GetReportsAsync();

        [Get("/api/reports/{id}")]
        Task<ReportItem> GetReportByIdAsync(string id);

        [Post("/api/reports")]
        Task CreateReportAsync([Body] ReportItem report);

        [Patch("/api/reports/{id}/status")]
        Task UpdateReportStatusAsync(string id, [Body] string status);

        [Delete("/api/reports/{id}")]
        Task SoftDeleteReportAsync(string id);

        [Patch("/api/reports/{id}/important")]
        Task MarkAsImportantAsync(string id);

        [Patch("/api/reports/{id}/completed")]
        Task MarkAsCompletedAsync(string id);
    }
}
