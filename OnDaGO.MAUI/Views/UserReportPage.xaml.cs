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

        public UserReportPage(ReportService reportService)
        {
            InitializeComponent();
            _reportService = reportService;
            SubmitButton.IsEnabled = false; // Disable the submit button initially
            GetUserProfile();  // Fetch the user profile on page load
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
                        _userId = response.Id;  // Store the UserId for report submission
                        _userEmail = response.Email;  // Store the user's email

                        // Automatically populate the UserIdEntry with the user's email
                        UserIdEntry.Text = _userEmail;

                        SubmitButton.IsEnabled = true; // Enable the submit button once the user profile is loaded
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching user profile: {ex.Message}");
                await DisplayAlert("Error", "Unable to retrieve user profile. Please try again later.", "OK");
            }
        }

        // Event handler for when the subject is changed (for "Other" option)
        // Event handler for when the subject is changed (for "Other" option)
        private void OnSubjectChanged(object sender, EventArgs e)
        {
            // Show the custom subject entry field only if "Other" is selected
            if (SubjectPicker.SelectedIndex == 0) // "Select a subject" is the 1st item (index 0)
            {
                CustomSubjectFrame.IsVisible = false;  // Hide the custom subject field
                SubmitButton.IsEnabled = false; // Disable submit until valid option is selected
            }
            else if (SubjectPicker.SelectedIndex == 8) // "Other" is the 9th item (index 8)
            {
                CustomSubjectFrame.IsVisible = false; // Hide the custom subject entry field
                SubmitButton.IsEnabled = true; // Enable submit button if "Other" is selected
            }
            else
            {
                CustomSubjectFrame.IsVisible = false; // Hide the custom subject entry field for any other selection
                SubmitButton.IsEnabled = true; // Enable submit button if valid subject is selected
            }
        }


        // Event handler for the Submit Report button
        // Event handler for the Submit Report button
        private async void OnSubmitReportClicked(object sender, EventArgs e)
        {
            // Use the user's email (retrieved from the profile) for the report
            _userId = _userEmail;

            // Validate input fields
            if (string.IsNullOrWhiteSpace(UserIdEntry.Text) ||
                string.IsNullOrWhiteSpace(SubjectPicker.SelectedItem?.ToString()) ||
                string.IsNullOrWhiteSpace(DescriptionEditor.Text) ||
                SubjectPicker.SelectedItem.ToString() == "Select a subject")
            {
                await DisplayAlert("Validation Error", "Please select a valid subject and enter a description.", "OK");
                return;
            }

            // Get the selected subject or custom subject
            string subject = SubjectPicker.SelectedItem.ToString();
            if (subject == "Other")
            {
                subject = "Other"; // Treat "Other" as the subject without needing the custom input field
            }

            // Create a new report with the provided UserId and "Pending" status
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
                // Call the API service to create the report
                await _reportService.CreateReportAsync(newReport);
                await DisplayAlert("Success", "Your report has been submitted successfully.", "OK");

                // Optionally, clear the fields or navigate away
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
