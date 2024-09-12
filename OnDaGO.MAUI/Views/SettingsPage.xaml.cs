using System;
using OnDaGO.MAUI.Views;

namespace OnDaGO.MAUI.Views
{
    public partial class SettingsPage : ContentPage
    {
        public SettingsPage()
        {
            InitializeComponent();
        }

        private async void OnDeleteAccountClicked(object sender, EventArgs e)
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
        }


        private async void OnLogoutClicked(object sender, EventArgs e)
        {
            try
            {
                var response = await App.AuthApi.Logout();

                if (response.IsSuccessStatusCode)
                {
                    // Clear the JWT token from SecureStorage
                    SecureStorage.Remove("jwt_token");

                    await DisplayAlert("Logged Out", "You have been logged out successfully.", "OK");
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
