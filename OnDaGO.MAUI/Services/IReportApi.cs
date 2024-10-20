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

        [Post("/api/reports")]
        Task CreateReportAsync([Body] ReportItem report);

        [Delete("/api/reports/{id}")]
        Task DeleteReportAsync(string id);

        [Patch("/api/reports/{id}/status")]
        Task UpdateReportStatusAsync(string id, [Body] string status);
    }
}
