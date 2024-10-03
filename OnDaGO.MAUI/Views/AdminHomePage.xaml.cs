using OnDaGO.MAUI.Models;
using Microsoft.Maui.Controls.Maps;
using Microsoft.Maui.Devices.Sensors;
using OnDaGO.MAUI.Services;
using Microsoft.Maui.Maps;
using System.Collections.Generic;
using System;
using System.Timers; // Import System.Timers
using System.Linq;

namespace OnDaGO.MAUI.Views
{
    public partial class AdminHomePage : ContentPage
    {
        private GoogleMapsApiService _googleMapsApiService;
        private VehicleService _vehicleService; // Declare the VehicleService
        private System.Timers.Timer _vehicleRefreshTimer; // Fully qualify the Timer
        private List<Pin> _currentPins = new List<Pin>(); // Store current pins to compare updates

        public AdminHomePage()
        {
            InitializeComponent();
            _googleMapsApiService = new GoogleMapsApiService("YOUR_GOOGLE_MAPS_API_KEY");
            _vehicleService = new VehicleService(); // Initialize the VehicleService

            // Increase timer interval to 5000 ms (5 seconds)
            _vehicleRefreshTimer = new System.Timers.Timer(1000);
            _vehicleRefreshTimer.Elapsed += OnVehicleRefreshTimerElapsed;
            _vehicleRefreshTimer.Start();

            // Load vehicles when the page is initialized
            LoadVehicles();
        }

        private async void LoadVehicles()
        {
            try
            {
                Console.WriteLine("Attempting to load vehicles...");

                // Fetch vehicle data
                List<VehicleModel> vehicles = await _vehicleService.GetVehiclesAsync();

                if (vehicles == null || vehicles.Count == 0)
                {
                    Console.WriteLine("No vehicles found.");
                    await DisplayAlert("Info", "No vehicles available.", "OK");
                    return;
                }

                // Optimize UI updates using Device.BeginInvokeOnMainThread for safe UI thread access
                Device.BeginInvokeOnMainThread(() =>
                {
                    // Get updated pins based on changed vehicle locations
                    UpdatePins(vehicles);
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading vehicles: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
                await DisplayAlert("Error", $"Failed to load vehicles: {ex.Message}", "OK");
            }
        }

        private void UpdatePins(List<VehicleModel> vehicles)
        {
            // Find new pins (vehicles that have moved or are newly added)
            var newPins = vehicles.Select(vehicle => new Pin
            {
                Label = $"PUV No: {vehicle.PuvNo}",
                Location = new Location(vehicle.CurrentLat, vehicle.CurrentLong),
                Type = PinType.Place
            }).ToList();

            // Only update the map if there's a change in pin locations
            if (!ArePinsEqual(newPins, _currentPins))
            {
                map.Pins.Clear();
                foreach (var pin in newPins)
                {
                    map.Pins.Add(pin);
                }

                // Update current pins to the new set
                _currentPins = new List<Pin>(newPins);
                Console.WriteLine($"Updated {newPins.Count} vehicle pins.");
            }
            else
            {
                Console.WriteLine("No vehicle movement detected, skipping pin update.");
            }
        }

        private bool ArePinsEqual(List<Pin> newPins, List<Pin> oldPins)
        {
            if (newPins.Count != oldPins.Count)
                return false;

            for (int i = 0; i < newPins.Count; i++)
            {
                if (newPins[i].Location.Latitude != oldPins[i].Location.Latitude ||
                    newPins[i].Location.Longitude != oldPins[i].Location.Longitude ||
                    newPins[i].Label != oldPins[i].Label)
                {
                    return false;
                }
            }
            return true;
        }

        private void OnVehicleRefreshTimerElapsed(object sender, ElapsedEventArgs e)
        {
            // Refresh the vehicle data
            LoadVehicles();
        }

        protected override void OnDisappearing()
        {
            base.OnDisappearing();
            _vehicleRefreshTimer.Stop();
            _vehicleRefreshTimer.Dispose();
        }

        // Other event handlers (unchanged)
        private async void OnProfileClicked(object sender, EventArgs e)
        {
            try
            {
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
                var fareMatrixService = new FareMatrixService();
                var fareMatrixList = await fareMatrixService.GetFareMatrixAsync();
                FareMatrixCollection.ItemsSource = fareMatrixList;
                FareMatrixTable.IsVisible = true;
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"Failed to load fare matrix: {ex.Message}", "OK");
            }
        }

        private void OnBackClicked(object sender, EventArgs e)
        {
            FareMatrixTable.IsVisible = false;
        }

        protected override bool OnBackButtonPressed()
        {
            if (FareMatrixTable.IsVisible)
            {
                FareMatrixTable.IsVisible = false;
                return true;
            }
            return base.OnBackButtonPressed();
        }
    }
}
