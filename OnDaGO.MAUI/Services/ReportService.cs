using Refit;
using OnDaGO.MAUI.Models;
using OnDaGO.MAUI.Services;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace OnDaGO.MAUI.Services
{
    public class ReportService
    {
        private readonly IReportApi _api;

        public ReportService()
        {
            string baseUrl = DeviceInfo.Platform == DevicePlatform.Android
                ? "http://10.0.2.2:5147"  // For Android Emulator
                : "https://localhost:7140"; // For iOS/Windows/Mac

            _api = RestService.For<IReportApi>(baseUrl);
        }

        public async Task<List<ReportItem>> GetReportsAsync()
        {
            return await _api.GetReportsAsync();
        }

        public async Task<ReportItem> GetReportByIdAsync(string id)
        {
            return await _api.GetReportByIdAsync(id);
        }

        public async Task CreateReportAsync(ReportItem report)
        {
            await _api.CreateReportAsync(report);
        }

        public async Task UpdateReportStatusAsync(string id, string status)
        {
            await _api.UpdateReportStatusAsync(id, status);
        }

        public async Task SoftDeleteReportAsync(string id)
        {
            await _api.SoftDeleteReportAsync(id);
        }

        public async Task MarkAsImportantAsync(string id)
        {
            await _api.MarkAsImportantAsync(id);
        }

        public async Task MarkAsCompletedAsync(string id)
        {
            await _api.MarkAsCompletedAsync(id);
        }
    }
}
