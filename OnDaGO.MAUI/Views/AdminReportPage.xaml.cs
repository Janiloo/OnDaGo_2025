using OnDaGO.MAUI.Models;
using OnDaGO.MAUI.Services;
using System;
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
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();
            await LoadReports();
        }

        private async Task LoadReports()
        {
            try
            {
                var reports = await _reportService.GetReportsAsync();
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

        private void OnPendingClicked(object sender, EventArgs e)
        {
            if (sender is Button button)
            {
                button.BackgroundColor = button.BackgroundColor == Colors.White ? Colors.LightBlue : Colors.White;
            }
        }

        private void OnImportantClicked(object sender, EventArgs e)
        {
            if (sender is Button button)
            {
                button.BackgroundColor = button.BackgroundColor == Colors.White ? Colors.Red : Colors.White;
            }
        }

        private void OnCompletedClicked(object sender, EventArgs e)
        {
            if (sender is Button button)
            {
                button.BackgroundColor = button.BackgroundColor == Colors.White ? Colors.LightGreen : Colors.White;
            }
        }

        private async void OnRefreshReportsClicked(object sender, EventArgs e)
        {
            await LoadReports();
        }
    }
}