using OnDaGO.MAUI.Services;
using OnDaGO.MAUI.Models;

namespace OnDaGO.MAUI.Views;

public partial class AdminSettingsPage : ContentPage
{
	public AdminSettingsPage()
	{
		InitializeComponent();
	}

    private async void OnCreateClicked(object sender, EventArgs e)
    {
        try
        {

            // Navigate to ProfilePage
            await Navigation.PushAsync(new CreateAdminPage());
        }
        catch (Exception ex)
        {
            await DisplayAlert("Error", $"Failed to navigate to Create Admin Page: {ex.Message}", "OK");
        }
    }

    private async void OnReportClicked(object sender, EventArgs e)
    {
        try
        {
            // Create an instance of ReportService
            var reportService = new ReportService();

            // Navigate to AdminReportPage, passing the reportService as a parameter
            await Navigation.PushAsync(new AdminReportPage(reportService));
        }
        catch (Exception ex)
        {
            await DisplayAlert("Error", $"Failed to navigate to Admin Report Page: {ex.Message}", "OK");
        }
    }

    private async void OnFareClicked(object sender, EventArgs e)
    {
        try
        {

            // Navigate to ProfilePage
            await Navigation.PushAsync(new EditFarePage());
        }
        catch (Exception ex)
        {
            await DisplayAlert("Error", $"Failed to navigate to Edit Fare Matrix Page: {ex.Message}", "OK");
        }
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