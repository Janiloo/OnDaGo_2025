using OnDaGO.MAUI.Models;
using OnDaGO.MAUI.Services;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using Microsoft.Maui.Controls;

namespace OnDaGO.MAUI.Views
{
    public partial class AdminReportPage : ContentPage
    {
        private readonly ReportService _reportService;
        public ObservableCollection<ReportItem> Reports { get; set; }

        public AdminReportPage(ReportService reportService)
        {
            InitializeComponent();
            _reportService = new ReportService();
            Reports = new ObservableCollection<ReportItem>();
            BindingContext = this;
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();
            await LoadReportsAsync();
        }

        private async Task LoadReportsAsync()
        {
            try
            {
                Console.WriteLine("Loading reports...");
                var reports = await _reportService.GetReportsAsync();

                Console.WriteLine($"Retrieved {reports?.Count} reports from API."); // Check if reports is null

                Reports.Clear();

                if (reports != null && reports.Count > 0)
                {
                    foreach (var report in reports)
                    {
                        Reports.Add(report);
                        Console.WriteLine($"Loaded report: {report.Subject}"); // Debugging line to check each report
                    }
                    Console.WriteLine($"Reports count after loading: {Reports.Count}"); // Debugging line
                }
                else
                {
                    Console.WriteLine("No reports found or reports is null."); // Debugging line
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading reports: {ex.Message}"); // Error handling
            }
        }





        // Command to mark a report as completed
        public Command<ReportItem> MarkAsCompletedCommand => new Command<ReportItem>(async (report) =>
        {
            if (report != null)
            {
                await _reportService.MarkAsCompletedAsync(report.Id.ToString());
                await LoadReportsAsync(); // Refresh the list after marking as completed
            }
        });
    }
}
