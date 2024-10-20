using System;
using OnDaGO.MAUI.Services;
using OnDaGO.MAUI.Views;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Storage;

namespace OnDaGO.MAUI.Views
{
    public partial class SettingsPage : ContentPage
    {
        private readonly ReportService _reportService;

        public SettingsPage()
        {
            InitializeComponent();
            _reportService = new ReportService(); // Initialize ReportService
        }

        /*private async void OnDeleteAccountClicked(object sender, EventArgs e)
        {
            bool confirmDelete = await DisplayAlert("Delete Account", "Are you sure you want to delete your account? This action cannot be undone.", "Yes", "No");

            if (!confirmDelete) return;

            try
            {
                // Call the API to delete the account
                var response = await App.AuthApi.DeleteAccount();

                if (response.IsSuccessStatusCode)
                {
                    // Clear the JWT token and navigate to the login page
                    SecureStorage.Remove("jwt_token");
                    await DisplayAlert("Account Deleted", "Your account has been deleted successfully.", "OK");
                    Application.Current.MainPage = new NavigationPage(new LoginPage());
                }
                else
                {
                    // Log the response details
                    var content = await response.Content.ReadAsStringAsync();
                    await DisplayAlert("Error", $"Account deletion failed. Status code: {response.StatusCode}. Response: {content}", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"An unexpected error occurred: {ex.Message}", "OK");
            }
        }*/

        private async void OnReportIssueClicked(object sender, EventArgs e)
        {
            // Pass the initialized ReportService to the UserReportPage
            await Navigation.PushAsync(new UserReportPage(_reportService));
        }

        private async void OnLogoutClicked(object sender, EventArgs e)
        {
            bool confirmLogout = await DisplayAlert("Logout", "Are you sure you want to log out?", "Yes", "No");

            if (!confirmLogout) return; // If the user selects "No", simply return and do nothing.

            try
            {
                var response = await App.AuthApi.Logout();

                if (response.IsSuccessStatusCode)
                {
                    // Clear the JWT token from SecureStorage
                    SecureStorage.Remove("jwt_token");
                    Application.Current.MainPage = new NavigationPage(new LoginPage());
                }
                else
                {
                    await DisplayAlert("Error", "Logout failed. Please try again.", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"An unexpected error occurred: {ex.Message}", "OK");
            }
        }

    }
}
