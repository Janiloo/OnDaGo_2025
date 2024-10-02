using OnDaGO.MAUI.Models;
using Microsoft.Maui.Controls.Maps;
using Microsoft.Maui.Devices.Sensors;
using OnDaGO.MAUI.Services;
using Microsoft.Maui.Maps;

namespace OnDaGO.MAUI.Views
{
    public partial class AdminHomePage : ContentPage
    {
        private GoogleMapsApiService _googleMapsApiService;

        public AdminHomePage()
        {
            InitializeComponent();
            _googleMapsApiService = new GoogleMapsApiService("YOUR_GOOGLE_MAPS_API_KEY");
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

        private async void ChangeMapType(object sender, EventArgs e)
        {
            var action = await DisplayActionSheet("Change Map Type", "Cancel", null, "Street", "Satellite");

            if (action == "Street")
            {
                map.MapType = MapType.Street;
            }
            else if (action == "Satellite")
            {
                map.MapType = MapType.Satellite;
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
                // No MainContent to set InputTransparent on; adjust as needed
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
            // No MainContent to set InputTransparent on; adjust as needed
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
}
