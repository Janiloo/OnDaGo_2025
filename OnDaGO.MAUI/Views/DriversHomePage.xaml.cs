using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Maps;
using Microsoft.Maui.Devices.Sensors;
using Microsoft.Maui.Maps;
using OnDaGO.MAUI.Models;
using OnDaGO.MAUI.Services;
using Refit;
using System;
using System.Linq;
using System.Threading.Tasks;
using Timer = System.Timers.Timer;

namespace OnDaGO.MAUI.Views
{
    public partial class DriversHomePage : ContentPage
    {
        private VehicleService _vehicleService;
        private VehicleModel driverVehicle;
        private UserItem driverProfile;
        private int passengerCount = 0;
        private bool initialLocationSet = false;
        private Timer locationUpdateTimer;

        public DriversHomePage()
        {
            InitializeComponent();
            _vehicleService = new VehicleService();
            LoadDriverProfile();
        }

        private async void LoadDriverProfile()
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
                        driverProfile = response;
                        await InitializeDriverVehicle();
                        StartLocationUpdates();
                    }
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"Error fetching driver profile: {ex.Message}", "OK");
            }
        }

        private async Task InitializeDriverVehicle()
        {
            try
            {
                if (driverProfile == null || string.IsNullOrWhiteSpace(driverProfile.PlateNumber))
                {
                    await DisplayAlert("Error", "Driver PlateNumber not found. Please contact admin.", "OK");
                    return;
                }

                var vehicles = await _vehicleService.GetVehiclesAsync();
                driverVehicle = vehicles.FirstOrDefault(v =>
                    string.Equals(v.PuvNo?.Trim(), driverProfile.PlateNumber?.Trim(), StringComparison.OrdinalIgnoreCase));

                if (driverVehicle == null)
                {
                    driverVehicle = new VehicleModel
                    {
                        PuvNo = driverProfile.PlateNumber,
                        CurrentLat = 0,
                        CurrentLong = 0,
                        PassengerCount = 0,
                        MaxPassengerCount = 60
                    };
                }

                passengerCount = driverVehicle.PassengerCount;
                PassengerCountLabel.Text = passengerCount.ToString();

            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"Failed to initialize vehicle: {ex.Message}", "OK");
            }
        }

        private async void OnIncrementPassenger(object sender, EventArgs e)
        {
            if (driverVehicle == null || passengerCount >= driverVehicle.MaxPassengerCount) return;
            passengerCount++;
            PassengerCountLabel.Text = passengerCount.ToString();
            await UpdateVehicleStatusBackend();
        }

        private async void OnDecrementPassenger(object sender, EventArgs e)
        {
            if (driverVehicle == null || passengerCount <= 0) return;
            passengerCount--;
            PassengerCountLabel.Text = passengerCount.ToString();
            await UpdateVehicleStatusBackend();
        }

        private async void OnClearPassengers(object sender, EventArgs e)
        {
            if (driverVehicle == null) return;
            bool confirm = await DisplayAlert("Clear All Passengers",
                "Are you sure you want to reset passenger count to 0?", "Yes", "No");

            if (confirm)
            {
                passengerCount = 0;
                PassengerCountLabel.Text = passengerCount.ToString();
                await UpdateVehicleStatusBackend();
            }
        }

        private async Task UpdateVehicleStatusBackend()
        {
            if (driverVehicle != null)
            {
                var request = new VehicleStatusUpdateRequest
                {
                    PassengerCount = passengerCount,
                    Latitude = driverVehicle.CurrentLat,
                    Longitude = driverVehicle.CurrentLong
                };

                try
                {
                    await _vehicleService.UpdateVehicleStatusAsync(driverVehicle.PuvNo, request);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to update vehicle: {ex.Message}");
                }
            }
        }

        private void StartLocationUpdates()
        {
            locationUpdateTimer = new Timer(3000);
            locationUpdateTimer.Elapsed += async (s, e) => await UpdateLocationAsync();
            locationUpdateTimer.AutoReset = true;
            locationUpdateTimer.Start();
        }

        private async Task UpdateLocationAsync()
        {
            try
            {
                var location = await Geolocation.GetLocationAsync(new GeolocationRequest
                {
                    DesiredAccuracy = GeolocationAccuracy.Best,
                    Timeout = TimeSpan.FromSeconds(10)
                });

                if (location != null && driverVehicle != null)
                {
                    driverVehicle.CurrentLat = location.Latitude;
                    driverVehicle.CurrentLong = location.Longitude;
                    await UpdateVehicleStatusBackend();

                    MainThread.BeginInvokeOnMainThread(() =>
                    {
                        if (!initialLocationSet)
                        {
                            map.MoveToRegion(MapSpan.FromCenterAndRadius(
                                new Location(location.Latitude, location.Longitude),
                                Distance.FromMeters(500)));
                            initialLocationSet = true;
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Location error: {ex.Message}");
            }
        }

        private async void OnSettingsClicked(object sender, EventArgs e)
        {
            await Navigation.PushAsync(new DriversSettings());
        }

        private async void OnProfileClicked(object sender, EventArgs e)
        {
            await Navigation.PushAsync(new DriversProfilePage());
        }

        private async void OnToggleBottomSheetClicked(object sender, EventArgs e)
        {
            if (!BottomSheet.IsVisible)
            {
                BottomSheetButton.IsVisible = false; // hide the button
                BottomSheetOverlay.IsVisible = true;
                BottomSheet.IsVisible = true;
                await BottomSheet.FadeTo(1, 250);
                BottomSheet.TranslationY = this.Height;
                await BottomSheet.TranslateTo(0, 0, 300, Easing.CubicInOut);
            }
            else
            {
                await CloseBottomSheet();
            }
        }

        private async void OnOverlayTapped(object sender, EventArgs e)
        {
            await CloseBottomSheet();
        }

        private async Task CloseBottomSheet()
        {
            await BottomSheet.TranslateTo(0, this.Height, 300, Easing.CubicInOut);
            await BottomSheet.FadeTo(0, 250);
            BottomSheet.IsVisible = false;
            BottomSheetOverlay.IsVisible = false;
            BottomSheetButton.IsVisible = true;
        }

        private async void OnBottomSheetPanUpdated(object sender, PanUpdatedEventArgs e)
        {
            if (e.StatusType == GestureStatus.Running)
            {
                BottomSheet.TranslationY += e.TotalY;
                if (BottomSheet.TranslationY < 0) BottomSheet.TranslationY = 0;
            }

            if (e.StatusType == GestureStatus.Completed)
            {
                if (BottomSheet.TranslationY > 150)
                {
                    await CloseBottomSheet();
                }
                else
                {
                    await BottomSheet.TranslateTo(0, 0, 300, Easing.CubicInOut);
                }
            }
        }

        protected override bool OnBackButtonPressed()
        {
#if ANDROID
            var activity = Platform.CurrentActivity;
            activity.MoveTaskToBack(true);
#elif IOS
#endif
            return true;
        }
    }
}
