using OnDaGO.MAUI.Models;
using OnDaGO.MAUI.Services;
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Maui.Controls;

namespace OnDaGO.MAUI.Views
{
    public partial class AdminReportPage : ContentPage
    {
        private readonly ReportService _reportService;

        public AdminReportPage(ReportService reportService)
        {
            InitializeComponent();
            _reportService = reportService;
            // Initialize the subject list for the Picker
            SubjectList = new[]
            {
                "All", "Lost Item", "Harassment", "Crime", "Accident", "Traffic Issue",
                "Road Damage", "Petty Theft", "Emergency Assistance", "Other"
            };
            SubjectPicker.ItemsSource = SubjectList;
            SubjectPicker.SelectedIndex = 0;  // Default to "All"
        }

        public string[] SubjectList { get; set; }

        protected override async void OnAppearing()
        {
            base.OnAppearing();
            await LoadReports();  // Default to "Newest First"
        }

        private async Task LoadReports(string subjectFilter = null)
        {
            try
            {
                var reports = await _reportService.GetReportsAsync();

                // Filter by subject if selected
                if (!string.IsNullOrEmpty(subjectFilter) && subjectFilter != "All")
                {
                    reports = reports.Where(r => r.Subject == subjectFilter).ToList();
                }

                // Sort reports by "Newest First" (most recent first)
                reports = reports.OrderByDescending(r => r.CreatedAt).ToList();

                ReportCollection.ItemsSource = reports;
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"Failed to load reports: {ex.Message}", "OK");
            }
        }

        private async void OnReportTapped(object sender, EventArgs e)
        {
            if (sender is Frame reportFrame && reportFrame.BindingContext is ReportItem report)
            {
                await DisplayAlert("Report Details", report.Description, "OK");
            }
        }

        private async void OnRefreshReportsClicked(object sender, EventArgs e)
        {
            await LoadReports();  // Reload reports when refresh button is clicked
        }

        private async void OnSubjectChanged(object sender, EventArgs e)
        {
            var selectedSubject = SubjectPicker.SelectedItem as string;
            await LoadReports(selectedSubject);  // Filter reports by selected subject
        }
    }
}
