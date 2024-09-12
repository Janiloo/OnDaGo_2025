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