using OnDaGO.MAUI.Models;
using OnDaGO.MAUI.Services;
using Microsoft.Maui.Controls;
using Refit;
using System;
using System.Threading.Tasks;

namespace OnDaGO.MAUI.Views
{
    public partial class UserReportPage : ContentPage
    {
        private readonly ReportService _reportService;
        private string _userId;
        private string _userEmail;
        private int _reportAttempts;
        private const int MaxAttempts = 3;
        private DateTime _lastReportDate;

        public UserReportPage(ReportService reportService)
        {
            InitializeComponent();
            _reportService = reportService;
            SubmitButton.IsEnabled = false;
            GetUserProfile();
            CheckReportAttempts();
        }

        private async Task GetUserProfile()
        {
            try
            {
                var token = await SecureStorage.GetAsync("jwt_token");
                if (!string.IsNullOrEmpty(token))
                {
                    var client = HttpClientFactory.CreateClient();
                    var authApi = RestService.For<IAuthApi>(client);
                    var response = await authApi.GetUserProfile();

                    if (response != null)
                    {
                        _userId = response.Id;
                        _userEmail = response.Email;
                        UserIdEntry.Text = _userEmail;
                        SubmitButton.IsEnabled = true;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching user profile: {ex.Message}");
                await DisplayAlert("Error", "Unable to retrieve user profile. Please try again later.", "OK");
            }
        }

        private void CheckReportAttempts()
        {
            // Load the last report date and attempts count
            if (Preferences.ContainsKey("LastReportDate"))
            {
                _lastReportDate = Preferences.Get("LastReportDate", DateTime.MinValue);
                _reportAttempts = Preferences.Get("ReportAttempts", 0);

                // Reset attempts if more than 24 hours have passed
                if ((DateTime.UtcNow - _lastReportDate).TotalHours >= 24)
                {
                    _reportAttempts = 0;
                    Preferences.Set("ReportAttempts", 0);
                }
            }

            UpdateAttemptsLabel();
        }

        private void UpdateAttemptsLabel()
        {
            int remainingAttempts = MaxAttempts - _reportAttempts;
            AttemptsLabel.Text = $"You have {remainingAttempts} attempts left today.";
            SubmitButton.IsEnabled = remainingAttempts > 0;
        }

        private void OnSubjectChanged(object sender, EventArgs e)
        {
            if (SubjectPicker.SelectedIndex == 0)
            {
                CustomSubjectFrame.IsVisible = false;
                SubmitButton.IsEnabled = false;
            }
            else if (SubjectPicker.SelectedIndex == 8)
            {
                CustomSubjectFrame.IsVisible = true;
            }
            else
            {
                CustomSubjectFrame.IsVisible = false;
                SubmitButton.IsEnabled = true;
            }
        }

        private async void OnSubmitReportClicked(object sender, EventArgs e)
        {
            if (_reportAttempts >= MaxAttempts)
            {
                await DisplayAlert("Limit Reached", "You have reached the maximum number of reports for today.", "OK");
                return;
            }

            if (string.IsNullOrWhiteSpace(UserIdEntry.Text) ||
                string.IsNullOrWhiteSpace(SubjectPicker.SelectedItem?.ToString()) ||
                string.IsNullOrWhiteSpace(DescriptionEditor.Text) ||
                SubjectPicker.SelectedItem.ToString() == "Select a subject")
            {
                await DisplayAlert("Validation Error", "Please select a valid subject and enter a description.", "OK");
                return;
            }

            string subject = SubjectPicker.SelectedItem.ToString();
            if (subject == "Other" && !string.IsNullOrWhiteSpace(CustomSubjectEntry.Text))
            {
                subject = CustomSubjectEntry.Text;
            }

            var newReport = new ReportItem
            {
                UserId = _userId,
                Subject = subject,
                Description = DescriptionEditor.Text,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            try
            {
                await _reportService.CreateReportAsync(newReport);
                await DisplayAlert("Success", "Your report has been submitted successfully.", "OK");

                _reportAttempts++;
                _lastReportDate = DateTime.UtcNow;

                // Save report attempt data
                Preferences.Set("ReportAttempts", _reportAttempts);
                Preferences.Set("LastReportDate", _lastReportDate);

                UpdateAttemptsLabel();

                SubjectPicker.SelectedIndex = -1;
                CustomSubjectEntry.Text = string.Empty;
                DescriptionEditor.Text = string.Empty;
            }
            catch (ApiException apiEx)
            {
                await DisplayAlert("Error", $"API error: {apiEx.Content}", "OK");
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"An error occurred while submitting the report: {ex.Message}", "OK");
            }
        }
    }
}
