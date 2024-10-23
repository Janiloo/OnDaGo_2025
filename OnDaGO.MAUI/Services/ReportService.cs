using Refit;
using OnDaGO.MAUI.Models;
using OnDaGO.MAUI.Services;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace OnDaGO.MAUI.Services
{
    public class ReportService
    {
        private readonly IReportApi _reportApi;

        /*public ReportService()
        {
            string baseUrl = DeviceInfo.Platform == DevicePlatform.Android
                ? "http://10.0.2.2:5147"  // For Android Emulator
                : "https://localhost:7140"; // For iOS/Windows/Mac

            _reportApi = RestService.For<IReportApi>(baseUrl);
        }*/

        public ReportService()
        {
            // Set the base URL to your Azure backend URL
            string baseUrl = "https://ondago-fbb0b6f0a7ede3cx.eastasia-01.azurewebsites.net";

            _reportApi = RestService.For<IReportApi>(baseUrl);
        }

        public Task<List<ReportItem>> GetReportsAsync() => _reportApi.GetReportsAsync();

        public Task CreateReportAsync(ReportItem report) => _reportApi.CreateReportAsync(report);

        public Task DeleteReportAsync(string id) => _reportApi.DeleteReportAsync(id);

        public Task UpdateReportStatusAsync(string id, string status) => _reportApi.UpdateReportStatusAsync(id, status);
    }
}
