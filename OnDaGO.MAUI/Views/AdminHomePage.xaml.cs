using OnDaGO.MAUI.Models;
using OnDaGO.MAUI.Services;

namespace OnDaGO.MAUI.Views;

public partial class AdminHomePage : ContentPage
{
    public AdminHomePage()
    {
        InitializeComponent();
    }

    private async void OnProfileClicked(object sender, EventArgs e)
    {
        try
        {
            // Navigate to ProfilePage
            await Navigation.PushAsync(new AdminProfilePage());
        }
        catch (Exception ex)
        {
            await DisplayAlert("Error", $"Failed to navigate to ProfilePage: {ex.Message}", "OK");
        }
    }

    private async void OnSettingsClicked(object sender, EventArgs e)
    {
        try
        {
            // Navigate to SettingsPage
            await Navigation.PushAsync(new AdminSettingsPage());
        }
        catch (Exception ex)
        {
            await DisplayAlert("Error", $"Failed to navigate to SettingsPage: {ex.Message}", "OK");
        }
    }

    private async void OnFareMatrixClicked(object sender, EventArgs e)
    {
        try
        {
            // Fetch the fare matrix data from your API service
            var fareMatrixService = new FareMatrixService();
            var fareMatrixList = await fareMatrixService.GetFareMatrixAsync();

            // Display the data in the CollectionView
            FareMatrixCollection.ItemsSource = fareMatrixList;

            // Show overlay and disable interactions for main content
            FareMatrixTable.IsVisible = true;
            MainContent.InputTransparent = true;
        }
        catch (Exception ex)
        {
            await DisplayAlert("Error", $"Failed to load fare matrix: {ex.Message}", "OK");
        }
    }

    private void OnBackClicked(object sender, EventArgs e)
    {
        // Hide the fare matrix overlay and re-enable interactions for main content
        FareMatrixTable.IsVisible = false;
        MainContent.InputTransparent = false;
    }

    protected override bool OnBackButtonPressed()
    {
        // Handle back button press differently if FareMatrixTable is visible
        if (FareMatrixTable.IsVisible)
        {
            FareMatrixTable.IsVisible = false;
            return true; // Prevent further back navigation
        }

        return base.OnBackButtonPressed(); // Default behavior if overlay is not shown
    }
}
