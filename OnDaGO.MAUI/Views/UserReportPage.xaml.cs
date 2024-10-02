using OnDaGO.MAUI.Services;
using OnDaGO.MAUI.Models;

namespace OnDaGO.MAUI.Views
{
    public partial class UserReportPage : ContentPage
    {
        private ReportItem _report;
        private ReportService _reportService;

        public string Subject
        {
            get => _report.Subject;
            set
            {
                _report.Subject = value;
                OnPropertyChanged(nameof(Subject));
            }
        }

        public string Description
        {
            get => _report.Description;
            set
            {
                _report.Description = value;
                OnPropertyChanged(nameof(Description));
            }
        }

        public UserReportPage()
        {
            InitializeComponent();

            _report = new ReportItem();
            _reportService = new ReportService();

            BindingContext = this;
        }

        private async void OnSubmitReportClicked(object sender, EventArgs e)
        {
            try
            {
                // Set the default status and inform the user to include contact information in the description
                _report.Status = "Pending"; // Default status for a new report

                // Ensure the description includes contact information
                if (string.IsNullOrEmpty(_report.Description) || !_report.Description.Contains("@"))
                {
                    await DisplayAlert("Error", "Please include your contact information in the description.", "OK");
                    return;
                }

                // Create the report
                await _reportService.CreateReportAsync(_report);

                await DisplayAlert("Success", "Report submitted!", "OK");
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"An error occurred: {ex.Message}", "OK");
            }
        }
    }
}
