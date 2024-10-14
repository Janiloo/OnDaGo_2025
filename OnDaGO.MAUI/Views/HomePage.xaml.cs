using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Maps;
using Microsoft.Maui.Devices.Sensors;
using Microsoft.Maui.Maps;
using Newtonsoft.Json.Linq;
using OnDaGO.MAUI.Services;
using System;
using Microsoft.Maui.Devices.Sensors;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using OnDaGO.MAUI.Handlers;
using OnDaGO.MAUI.Models;

namespace OnDaGO.MAUI.Views
{
    public partial class HomePage : ContentPage
    {
        private GoogleMapsApiService _googleMapsApiService;
        private bool _isSearchVisible;

        // Define the LocationItem class
        public class LocationItem
        {
            public string Name { get; set; }
            public Location Coordinates { get; set; }
        }


        // Initialize all locations
        private List<LocationItem> allLocations = new List<LocationItem>
        {
            new LocationItem { Name = "Montalban Highway", Coordinates = new Location(14.7288, 121.1441) },
            new LocationItem { Name = "Montaña", Coordinates = new Location(14.7151, 121.1360) },
            new LocationItem { Name = "Maly", Coordinates = new Location(14.7114, 121.1337) },
            new LocationItem { Name = "Dulong Bayan", Coordinates = new Location(14.7010, 121.1253) },
            new LocationItem { Name = "San Mateo Bayan", Coordinates = new Location(14.6968, 121.1205) },
            new LocationItem { Name = "San Mateo Doctors Hospital", Coordinates = new Location(14.6936, 121.1174) },
            new LocationItem { Name = "Ampid", Coordinates = new Location(14.6845, 121.1159) },
            new LocationItem { Name = "Banaba", Coordinates = new Location(14.6793, 121.1128) },
            new LocationItem { Name = "Nangka", Coordinates = new Location(14.6737, 121.1094) },
            new LocationItem { Name = "Fairlane", Coordinates = new Location(14.6628, 121.1061) },
            new LocationItem { Name = "Tumana", Coordinates = new Location(14.6584, 121.1040) },
            new LocationItem { Name = "Bantayog", Coordinates = new Location(14.6537, 121.1043) },
            new LocationItem { Name = "Conception", Coordinates = new Location(14.6505, 121.1035) },
            new LocationItem { Name = "Golden Valley", Coordinates = new Location(14.6467, 121.1017) },
            new LocationItem { Name = "Home Owners Dr", Coordinates = new Location(14.6402, 121.0986) },
            new LocationItem { Name = "Savemore Bayan", Coordinates = new Location(14.6372, 121.0973) },
            new LocationItem { Name = "Tañong", Coordinates = new Location(14.6361, 121.0925) },
            new LocationItem { Name = "Marikina Riverbanks", Coordinates = new Location(14.6329, 121.0828) },
            new LocationItem { Name = "Katipunan", Coordinates = new Location(14.6310, 121.0725) },
            new LocationItem { Name = "J.P Rizal", Coordinates = new Location(14.6294, 121.0692) },
            new LocationItem { Name = "Anonas Ave.", Coordinates = new Location(14.6278, 121.0631) },
            new LocationItem { Name = "LTO 20th Ave.", Coordinates = new Location(14.6265, 121.0604) },
            new LocationItem { Name = "Daily Supermarket 20th Ave.", Coordinates = new Location(14.6248, 121.0572) },
            new LocationItem { Name = "Alimall", Coordinates = new Location(14.6232, 121.0541) },
            new LocationItem { Name = "Araneta Center Terminal", Coordinates = new Location(14.6212, 121.0553) }
        };

        public HomePage()
        {
            InitializeComponent();
            _googleMapsApiService = new GoogleMapsApiService("YOUR_GOOGLE_MAPS_API_KEY");

            _isSearchVisible = false;
            FrameLayout.IsVisible = false;
            FrameLayout.TranslationY = FrameLayout.Height;

            var tapGestureRecognizer = new TapGestureRecognizer();
            tapGestureRecognizer.Tapped += OnOverlayTapped;
            Overlay.GestureRecognizers.Add(tapGestureRecognizer);

            foreach (var loc in allLocations)
            {
                StartLocationPicker.Items.Add(loc.Name);
                EndLocationPicker.Items.Add(loc.Name);
            }
            EndLocationPicker.Items.Reverse();

            // Initialize the map with the default toggle value
            OnLocationToggled(null, new ToggledEventArgs(true)); // Assume the default is Cubao
        }

        private async void LoadFareMatrixInBottomSheet()
        {
            try
            {
                var fareMatrixService = new FareMatrixService();
                var fareMatrixList = await fareMatrixService.GetFareMatrixAsync();
                FareMatrixCollection.ItemsSource = fareMatrixList;  // Bind the fetched data to the CollectionView
                ScrollableContent.IsVisible = true;  // Make sure the content is visible
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"Failed to load fare matrix: {ex.Message}", "OK");
            }
        }


        private async void OnOverlayTapped(object sender, EventArgs e)
        {
            if (_isSearchVisible)
            {
                await SlideDown(FrameLayout);
                _isSearchVisible = false;
                FrameLayout.IsVisible = false;
                Overlay.IsVisible = false; // Hide the overlay after closing FrameLayout

            }
        }

        private bool isToggled = false;

        private async void OnLocationToggled(object sender, EventArgs e)
        {
            // Toggle the state
            isToggled = !isToggled;

            // Update the image source
            ToggleImage.Source = isToggled ? "Images/toggleon.svg" : "Images/toggleoff.svg";

            // Clear existing pins and map elements
            map.Pins.Clear();
            map.MapElements.Clear();
            LocationLabel.Text = isToggled ? "Cubao" : "Montalban";

            // Determine which list of locations to use based on toggle
            var filteredLocations = isToggled
                ? allLocations.Where(loc => /* Define criteria for Cubao */ true).ToList()
                : allLocations.Where(loc => /* Define criteria for Montalban */ true).ToList();

            // Add pins and circles to the map
            foreach (var loc in filteredLocations)
            {
                var pin = new Pin
                {
                    Label = loc.Name,
                    Location = loc.Coordinates,
                    Type = PinType.Place,
                    Address = loc.Name
                };

                var customPin = new CustomPin
                {
                    Pin = pin,
                    Icon = "bustop.png"
                };
                map.Pins.Add(customPin.Pin);


                var yellowCircle = new Circle
                {
                    Center = loc.Coordinates,
                    Radius = new Microsoft.Maui.Maps.Distance(10), // 10 meters
                    StrokeColor = Microsoft.Maui.Graphics.Colors.Yellow, // Yellow color
                    StrokeWidth = 5,
                    FillColor = Microsoft.Maui.Graphics.Colors.Yellow.WithAlpha(0.5f) // 50% opacity
                };
                map.MapElements.Add(yellowCircle);
            }

            // Center the map to show both Rodriguez Rizal and Quezon City
            var centerLocation = new Location(14.658330, 121.103572); // Center between Rodriguez and Quezon City
            map.MoveToRegion(MapSpan.FromCenterAndRadius(centerLocation, new Microsoft.Maui.Maps.Distance(6000))); // Adjust the distance for zoom level
        }


        public class CustomPin
        {
            public Pin Pin { get; set; }
            public string Icon { get; set; }
        }

        /*private async void OnGetDirectionsClicked(object sender, EventArgs e)
        {
            map.IsTrafficEnabled = false;

            if (StartLocationPicker.SelectedIndex == -1 || EndLocationPicker.SelectedIndex == -1)
            {
                await DisplayAlert("Error", "Please select both start and end locations.", "OK");
                return;
            }

            string startLocationName = StartLocationPicker.SelectedItem.ToString();
            string endLocationName = EndLocationPicker.SelectedItem.ToString();

            if (startLocationName == endLocationName)
            {
                await DisplayAlert("Error", "Start and end locations cannot be the same.", "OK");
                return;
            }

            // Get directions and display them
            await GetDirectionsAsync(startLocationName, endLocationName);
        }


        private async Task GetDirectionsAsync(string startLocationName, string endLocationName)
        {
            // Retrieve the selected LocationItems
            var startLocationItem = allLocations.FirstOrDefault(loc => loc.Name == startLocationName);
            var endLocationItem = allLocations.FirstOrDefault(loc => loc.Name == endLocationName);

            if (startLocationItem == null || endLocationItem == null)
            {
                await DisplayAlert("Error", "Selected locations are invalid.", "OK");
                return;
            }

            var start = startLocationItem.Coordinates;
            var end = endLocationItem.Coordinates;

            try
            {
                var directions = await _googleMapsApiService.GetDirectionsAsync(start.Latitude, start.Longitude, end.Latitude, end.Longitude);

                // Log the full response for debugging
                string responseContent = directions.ToString();
                await DisplayAlert("API Response", responseContent, "OK"); // Show the API response (you can remove this later)

                var status = directions["status"]?.ToString();
                if (status != "OK")
                {
                    await DisplayAlert("Error", $"Directions API returned status: {status}", "OK");
                    return;
                }

                if (directions != null && directions["routes"]?.Any() == true)
                {
                    var route = directions["routes"].First();
                    var encodedPoints = route["overview_polyline"]?["points"]?.ToString();

                    if (!string.IsNullOrEmpty(encodedPoints))
                    {
                        var points = DecodePolyline(encodedPoints);

                        // Filter points to limit the route between the two pins
                        var filteredPoints = points.Where(p => IsPointWithinRange(p, start, end)).ToList();

                        var polyline = new Polyline
                        {
                            StrokeColor = Color.FromArgb("#efbb6b"), // Updated color
                            StrokeWidth = 30,
                        };

                        foreach (var point in filteredPoints)
                        {
                            polyline.Geopath.Add(new Location(point.Latitude, point.Longitude));
                        }

                        // Clear existing polylines
                        map.MapElements.Clear();

                        // Add the new polyline
                        map.MapElements.Add(polyline);

                        // Adjust the map to show the route between the two pins
                        var region = CalculateMapRegion(filteredPoints);
                        map.MoveToRegion(region);
                    }
                    else
                    {
                        await DisplayAlert("Error", "Unable to retrieve route information. Encoded points missing.", "OK");
                    }
                }
                else
                {
                    await DisplayAlert("Error", "No routes found in the response.", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Exception", $"An error occurred: {ex.Message}", "OK");
            }
        }*/

        private List<Pin> savedPins = new List<Pin>(); // To store the pins

        private async void OnGetDirectionsClicked(object sender, EventArgs e)
        {
            map.IsTrafficEnabled = false;

            if (StartLocationPicker.SelectedIndex == -1 || EndLocationPicker.SelectedIndex == -1)
            {
                await DisplayAlert("Error", "Please select both start and end locations.", "OK");
                return;
            }

            string startLocationName = StartLocationPicker.SelectedItem.ToString();
            string endLocationName = EndLocationPicker.SelectedItem.ToString();

            if (startLocationName == endLocationName)
            {
                await DisplayAlert("Error", "Start and end locations cannot be the same.", "OK");
                return;
            }

            // Retrieve the selected LocationItems
            var startLocationItem = allLocations.FirstOrDefault(loc => loc.Name == startLocationName);
            var endLocationItem = allLocations.FirstOrDefault(loc => loc.Name == endLocationName);

            if (startLocationItem == null || endLocationItem == null)
            {
                await DisplayAlert("Error", "Selected locations are invalid.", "OK");
                return;
            }

            var start = startLocationItem.Coordinates;
            var end = endLocationItem.Coordinates;

            // Store existing pins before clearing them
            savedPins = map.Pins.ToList();
            map.Pins.Clear(); // Disable (clear) other pins

            // Draw a straight line between the start and end locations
            var polyline = new Polyline
            {
                StrokeColor = Color.FromArgb("#efbb6b"), // Updated color
                StrokeWidth = 30,
            };

            polyline.Geopath.Add(start);
            polyline.Geopath.Add(end);

            // Clear existing polylines and elements
            map.MapElements.Clear();

            // Add the straight line polyline
            map.MapElements.Add(polyline);

            // Adjust the map to show the line between the two points
            var region = CalculateMapRegion(new List<Location> { start, end });
            map.MoveToRegion(region);
        }



        // Helper function to filter points within the straight path between start and end
        private bool IsPointWithinRange(Location point, Location start, Location end)
        {
            // Implement logic to check if point is within a reasonable range between start and end
            // You can calculate distance from the line formed by start and end locations
            return true;
        }

        // Helper function to calculate the map region
        private MapSpan CalculateMapRegion(List<Location> points)
        {
            var minLat = points.Min(p => p.Latitude);
            var maxLat = points.Max(p => p.Latitude);
            var minLng = points.Min(p => p.Longitude);
            var maxLng = points.Max(p => p.Longitude);

            var centerLat = (minLat + maxLat) / 2;
            var centerLng = (minLng + maxLng) / 2;

            var spanLat = Math.Abs(maxLat - minLat) * 1.2; // Add some padding
            var spanLng = Math.Abs(maxLng - minLng) * 1.2;

            return new MapSpan(new Location(centerLat, centerLng), spanLat, spanLng);
        }


        private void ClearPolylines()
        {
            // Clear existing polylines and elements from the map
            map.MapElements.Clear();
        }

        public List<Location> DecodePolyline(string encodedPoints)
        {
            if (string.IsNullOrEmpty(encodedPoints))
                return new List<Location>();

            var poly = new List<Location>();
            int index = 0, len = encodedPoints.Length;
            int lat = 0, lng = 0;

            while (index < len)
            {
                int b, shift = 0, result = 0;
                do
                {
                    b = encodedPoints[index++] - 63;
                    result |= (b & 0x1F) << shift;
                    shift += 5;
                } while (b >= 0x20);
                int dlat = ((result & 1) != 0) ? ~(result >> 1) : (result >> 1);
                lat += dlat;

                shift = 0;
                result = 0;
                do
                {
                    b = encodedPoints[index++] - 63;
                    result |= (b & 0x1F) << shift;
                    shift += 5;
                } while (b >= 0x20);
                int dlng = ((result & 1) != 0) ? ~(result >> 1) : (result >> 1);
                lng += dlng;

                var point = new Location(lat / 1E5, lng / 1E5);
                poly.Add(point);
            }

            return poly;
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
                map.MapType = MapType.Hybrid;
            }
        }

        private async Task SlideUp(Frame frame)
        {
            // Ensure the frame is hidden before starting the animation
            frame.IsVisible = true;

            // Slide up animation
            await frame.TranslateTo(0, 0, 300, Easing.CubicInOut);
        }

        private async Task SlideDown(Frame frame)
        {
            // Slide down animation
            await frame.TranslateTo(0, frame.Height, 300, Easing.CubicInOut);

            // Ensure the frame is hidden after the animation
            frame.IsVisible = false;
        }

        private async void ToggleSearchFields(object sender, EventArgs e)
        {
            if (_isSearchVisible)
            {
                // Slide down the FrameLayout
                await SlideDown(FrameLayout);
                map.IsTrafficEnabled = true;
                ClearPolylines();
            }
            else
            {
                // Make the FrameLayout visible and set its position off-screen
                FrameLayout.TranslationY = Height; // Start position (off-screen)
                await SlideUp(FrameLayout);
                BottomSheet.IsVisible = false; // Hide the Bottom Sheet
                map.IsTrafficEnabled = false;

            }

            // Toggle the visibility flag
            _isSearchVisible = !_isSearchVisible;
        }

        private async void OnToggleBottomSheetClicked(object sender, EventArgs e)
        {
            if (!BottomSheet.IsVisible)
            {
                BottomSheet.IsVisible = true; // Show the Bottom Sheet
                await BottomSheet.FadeTo(1, 250); // Fade in

                await SlideDown(FrameLayout);


                // Start off-screen (just above the bottom)
                map.IsTrafficEnabled = false;
                BottomSheet.TranslationY = this.Height; // Adjust to fit the screen size
                await BottomSheet.TranslateTo(0, 0, 300, Easing.CubicInOut); // Slide up to reveal
                ScrollableContent.IsVisible = true; // Show the scrollable content
                LoadFareMatrixInBottomSheet();
            }
            else
            {
                await BottomSheet.TranslateTo(0, this.Height, 300, Easing.CubicInOut); // Slide down
                await BottomSheet.FadeTo(0, 250); // Fade out
                map.IsTrafficEnabled = true;
                BottomSheet.IsVisible = false; // Hide the Bottom Sheet
                ScrollableContent.IsVisible = false; // Hide the scrollable content


            }
        }

        private async void OnCloseBottomSheetClicked(object sender, EventArgs e)
        {
            ClearPolylines();

            await BottomSheet.TranslateTo(0, this.Height, 300, Easing.CubicInOut); // Slide down
            await BottomSheet.FadeTo(0, 250); // Fade out
            BottomSheet.IsVisible = false; // Hide the Bottom Sheet
            ScrollableContent.IsVisible = false; // Hide the scrollable content
            map.IsTrafficEnabled = true;
        }

        private void OnBottomSheetPanUpdated(object sender, PanUpdatedEventArgs e)
        {
            if (e.StatusType == GestureStatus.Running)
            {
                // Move the Bottom Sheet based on the drag amount
                BottomSheet.TranslationY += e.TotalY;

                // Prevent moving the sheet too far up
                if (BottomSheet.TranslationY < 0)
                {
                    BottomSheet.TranslationY = 0;
                }
            }

            if (e.StatusType == GestureStatus.Completed)
            {
                // Only close the bottom sheet if dragged downward (e.TotalY > 0)
                // and if the bottom sheet has moved more than 150 pixels (threshold)
                if (BottomSheet.TranslationY > 150) // Adjust the threshold as needed
                {
                    // Close the bottom sheet by moving it off the screen
                    BottomSheet.TranslateTo(0, this.Height, 300, Easing.CubicInOut);

                    // After the animation, make it invisible
                    BottomSheet.FadeTo(0, 250); // Optional: Fade out for smoother effect
                    BottomSheet.IsVisible = false; // Hide the sheet
                    map.IsTrafficEnabled = true;
                }
                else
                {
                    // If not dragged down enough, snap it back to the top
                    BottomSheet.TranslateTo(0, 0, 300, Easing.CubicInOut); // Move back to original position
                }
            }
        }





        private async void OnSettingsClicked(object sender, EventArgs e)
        {
            try
            {
                // Navigate to SettingsPage
                await Navigation.PushAsync(new SettingsPage());
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"Failed to navigate to SettingsPage: {ex.Message}", "OK");
            }
        }

        private async void OnProfileClicked(object sender, EventArgs e)
        {
            try
            {
                // Navigate to ProfilePage
                await Navigation.PushAsync(new ProfilePage());
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"Failed to navigate to ProfilePage: {ex.Message}", "OK");
            }
        }

        private async Task UpdateMapToUserLocation()
        {
            try
            {
                var userLocation = await Geolocation.Default.GetLastKnownLocationAsync();

                if (userLocation != null)
                {
                    // Set the map's region to the user's location with a closer zoom level
                    map.MoveToRegion(MapSpan.FromCenterAndRadius(
                        new Location(userLocation.Latitude, userLocation.Longitude),
                        new Microsoft.Maui.Maps.Distance(0.1))); // Zoom level is closer to the user

                    // Optionally, add a pin at the user's location
                    var userPin = new Pin
                    {
                        Label = "You are here",
                        Location = new Location(userLocation.Latitude, userLocation.Longitude),
                        Type = PinType.Place
                    };
                    map.Pins.Add(userPin);

                    // Add a circle around the user's location
                    var userCircle = new Circle
                    {
                        Center = new Location(userLocation.Latitude, userLocation.Longitude),
                        Radius = new Microsoft.Maui.Maps.Distance(50), // 50 meters
                        StrokeColor = Colors.Blue,
                        StrokeWidth = 2,
                        FillColor = Colors.Blue.WithAlpha(0.5f)
                    };
                    map.MapElements.Add(userCircle);

                    // Check the user's proximity to the predefined locations
                    await CheckUserProximity();
                }
                else
                {
                    await DisplayAlert("Error", "Unable to retrieve user location.", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"An error occurred while retrieving user location: {ex.Message}", "OK");
            }
        }

        protected override bool OnBackButtonPressed()
        {
            // Send the app to the background (instead of forcefully closing it)
            bool shouldExitApp = true;

            if (shouldExitApp)
            {
#if ANDROID
                // Minimize the app, keeping it running in the background
                var activity = Platform.CurrentActivity;
                activity.MoveTaskToBack(true);
#elif IOS
                // iOS doesn't allow programmatic exit, so the user would normally use the home button
                Thread.CurrentThread.Abort(); // iOS workaround (use cautiously)
#endif
            }

            return true; // Return true to prevent default back navigation behavior
        }

        //private async void OnProfileClickes(object sender, EventArgs e)
        //{
        // Navigate to ProfilePage
        //    await Navigation.PushAsync(new ProfilePage());
        //}

        //private async void OnHomeClicked(object sender, EventArgs e)
        //{
        // Optionally refresh or perform some action for Home tab
        //}



        private async void OnSettingsClickes(object sender, EventArgs e)
        {
            // Navigate to SettingsPage
            await Navigation.PushAsync(new SettingsPage());
        }

        private async void OnCloseButtonClicked(object sender, EventArgs e)
        {
            await SlideDown(FrameLayout); // Slide down and hide the Frame
            _isSearchVisible = false;
            map.IsTrafficEnabled = true;

            // Clear the drawn polyline (straight line) when the frame is closed
            ClearPolylines();

            // Re-add the saved pins when the frame is closed
            foreach (var pin in savedPins)
            {
                map.Pins.Add(pin);
            }

            savedPins.Clear(); // Clear the saved pins after they are re-added
        }



        private async Task CheckUserProximity()
        {
            var userLocation = await Geolocation.Default.GetLastKnownLocationAsync();

            if (userLocation != null)
            {
                foreach (var loc in allLocations)
                {
                    var distance = userLocation.CalculateDistance(loc.Coordinates.Latitude, loc.Coordinates.Longitude, DistanceUnits.Kilometers);

                    if (distance <= 0.01) // 10 meters
                    {
                        var alertPin = new Pin
                        {
                            Label = "You are here!",
                            Location = new Location(userLocation.Latitude, userLocation.Longitude),
                            Type = PinType.Place
                        };
                        map.Pins.Add(alertPin);

                        var yellowCircle = new Circle
                        {
                            Center = new Location(userLocation.Latitude, userLocation.Longitude),
                            Radius = new Microsoft.Maui.Maps.Distance(10), // 10 meters
                            StrokeColor = Colors.Yellow, // Yellow color
                            StrokeWidth = 5,
                            FillColor = Colors.Yellow.WithAlpha(0.5f) // 50% opacity
                        };
                        map.MapElements.Add(yellowCircle);

                        break;
                    }
                }
            }
        }
    }
}
