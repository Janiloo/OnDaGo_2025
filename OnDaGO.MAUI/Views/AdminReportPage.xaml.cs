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

        // Constructor that accepts ReportService as a parameter
        public AdminReportPage(ReportService reportService)
        {
            InitializeComponent();
            _reportService = reportService;
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();
            await LoadReports(); // Call method to load reports when the page appears
        }

        private async Task LoadReports()
        {
            try
            {
                var reports = await _reportService.GetReportsAsync();
                ReportCollection.ItemsSource = reports; // Binding data to CollectionView
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"Failed to load reports: {ex.Message}", "OK");
            }
        }

        // Event handler for the refresh button
        private async void OnRefreshReportsClicked(object sender, EventArgs e)
        {
            await LoadReports(); // Reload the reports
        }
    }
}
