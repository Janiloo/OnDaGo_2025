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
using OnDaGO.MAUI.Models;
using System.Timers;

namespace OnDaGO.MAUI.Views
{
    public partial class AdminHomePage : ContentPage
    {
        private System.Timers.Timer locationUpdateTimer;
        private GoogleMapsApiService _googleMapsApiService;
        private bool _isSearchVisible;
        private VehicleService _vehicleService;
        private System.Timers.Timer _vehicleRefreshTimer;
        private List<Pin> _currentPins = new List<Pin>();
        private int passengerCount = 0;
        private System.Timers.Timer passengerCountCheckTimer;

        public VehicleModel SelectedVehicle { get; set; }

        public class LocationItem
        {
            public string Name { get; set; }
            public Location Coordinates { get; set; }
        }

        private List<LocationItem> allLocations = new List<LocationItem>
        {
            new LocationItem { Name = "Montalban Highway", Coordinates = new Location(14.7288, 121.1441) },
            new LocationItem { Name = "Maly", Coordinates = new Location(14.7114, 121.1337) },
            new LocationItem { Name = "San Mateo Bayan", Coordinates = new Location(14.6967, 121.1205) },
            new LocationItem { Name = "Nangka", Coordinates = new Location(14.6737, 121.1094) },
            new LocationItem { Name = "Concepcion", Coordinates = new Location(14.6505, 121.1035) },
            new LocationItem { Name = "Savemore Bayan", Coordinates = new Location(14.6372, 121.0973) },
            new LocationItem { Name = "Marikina Riverbanks", Coordinates = new Location(14.6329, 121.0828) },
            new LocationItem { Name = "Cubao", Coordinates = new Location(14.621360, 121.055222) }
        };

        private readonly Dictionary<(string, string), (int Regular, int Discounted)> fareMatrix = new()
        {
            { ("Montalban Highway", "Montalban Highway"), (15, 13) },
            { ("Montalban Highway", "Maly"), (20, 16) },
            { ("Montalban Highway", "San Mateo Bayan"), (25, 20) },
            { ("Montalban Highway", "Nangka"), (30, 25) },
            { ("Montalban Highway", "Concepcion"), (35, 30) },
            { ("Montalban Highway", "Savemore Bayan"), (40, 35) },
            { ("Montalban Highway", "Marikina Riverbanks"), (45, 40) },
            { ("Montalban Highway", "Cubao"), (50, 45) },

            { ("Maly", "Montalban Highway"), (20, 16) },
            { ("Maly", "Maly"), (15, 13) },
            { ("Maly", "San Mateo Bayan"), (20, 16) },
            { ("Maly", "Nangka"), (25, 20) },
            { ("Maly", "Concepcion"), (30, 25) },
            { ("Maly", "Savemore Bayan"), (35, 30) },
            { ("Maly", "Marikina Riverbanks"), (40, 35) },
            { ("Maly", "Cubao"), (45, 30) },

            { ("San Mateo Bayan", "Montalban Highway"), (25, 20) },
            { ("San Mateo Bayan", "Maly"), (20, 16) },
            { ("San Mateo Bayan", "San Mateo Bayan"), (15, 13) },
            { ("San Mateo Bayan", "Nangka"), (20, 16) },
            { ("San Mateo Bayan", "Concepcion"), (25, 20) },
            { ("San Mateo Bayan", "Savemore Bayan"), (30, 25) },
            { ("San Mateo Bayan", "Marikina Riverbanks"), (35, 30) },
            { ("San Mateo Bayan", "Cubao"), (40, 35) },

            { ("Nangka", "Montalban Highway"), (30, 25) },
            { ("Nangka", "Maly"), (25, 20) },
            { ("Nangka", "San Mateo Bayan"), (20, 16) },
            { ("Nangka", "Nangka"), (15, 13) },
            { ("Nangka", "Concepcion"), (20, 16) },
            { ("Nangka", "Savemore Bayan"), (25, 20) },
            { ("Nangka", "Marikina Riverbanks"), (30, 25) },
            { ("Nangka", "Cubao"), (35, 30) },

            { ("Concepcion", "Montalban Highway"), (35, 30) },
            { ("Concepcion", "Maly"), (30, 25) },
            { ("Concepcion", "San Mateo Bayan"), (25, 20) },
            { ("Concepcion", "Nangka"), (20, 16) },
            { ("Concepcion", "Concepcion"), (15, 13) },
            { ("Concepcion", "Savemore Bayan"), (20, 16) },
            { ("Concepcion", "Marikina Riverbanks"), (25, 20) },
            { ("Concepcion", "Cubao"), (30, 25) },

            { ("Savemore Bayan", "Montalban Highway"), (40, 35) },
            { ("Savemore Bayan", "Maly"), (35, 30) },
            { ("Savemore Bayan", "San Mateo Bayan"), (30, 25) },
            { ("Savemore Bayan", "Nangka"), (25, 20) },
            { ("Savemore Bayan", "Concepcion"), (20, 16) },
            { ("Savemore Bayan", "Savemore Bayan"), (15, 13) },
            { ("Savemore Bayan", "Marikina Riverbanks"), (20, 16) },
            { ("Savemore Bayan", "Cubao"), (25, 20) },

            { ("Marikina Riverbanks", "Montalban Highway"), (45, 40) },
            { ("Marikina Riverbanks", "Maly"), (40, 35) },
            { ("Marikina Riverbanks", "San Mateo Bayan"), (35, 30) },
            { ("Marikina Riverbanks", "Nangka"), (30, 25) },
            { ("Marikina Riverbanks", "Concepcion"), (25, 20) },
            { ("Marikina Riverbanks", "Savemore Bayan"), (20, 16) },
            { ("Marikina Riverbanks", "Marikina Riverbanks"), (15, 16) },
            { ("Marikina Riverbanks", "Cubao"), (20, 16) },

            { ("Cubao", "Montalban Highway"), (50, 45) },
            { ("Cubao", "Maly"), (45, 40) },
            { ("Cubao", "San Mateo Bayan"), (40, 35) },
            { ("Cubao", "Nangka"), (35, 30) },
            { ("Cubao", "Concepcion"), (30, 25) },
            { ("Cubao", "Savemore Bayan"), (25, 20) },
            { ("Cubao", "Marikina Riverbanks"), (20, 16) },
            { ("Cubao", "Cubao"), (15, 13) }
        };



        public AdminHomePage()
        {
            InitializeComponent();
            _googleMapsApiService = new GoogleMapsApiService("YOUR_GOOGLE_MAPS_API_KEY");
            _vehicleService = new VehicleService();
            _vehicleRefreshTimer = new System.Timers.Timer(1000);
            _vehicleRefreshTimer.Elapsed += OnVehicleRefreshTimerElapsed;
            _vehicleRefreshTimer.Start();
            StartLocationUpdates();
            _isSearchVisible = false;
            FrameLayout.IsVisible = false;
            StartPassengerCountMonitor();
            FrameLayout.TranslationY = FrameLayout.Height;
            LoadVehicles();
            var tapGestureRecognizer = new TapGestureRecognizer();
            tapGestureRecognizer.Tapped += OnOverlayTapped;
            Overlay.GestureRecognizers.Add(tapGestureRecognizer);

            StartLocationPicker.SelectedIndexChanged += (s, e) => UpdateFare();
            EndLocationPicker.SelectedIndexChanged += (s, e) => UpdateFare();


            foreach (var loc in allLocations)
            {
                StartLocationPicker.Items.Add(loc.Name);
                EndLocationPicker.Items.Add(loc.Name);
            }
            EndLocationPicker.Items.Reverse();

            OnLocationToggled(null, new ToggledEventArgs(true));

            UpdateMapToUserLocation();
        }

        private void UpdateFare()
        {
            if (StartLocationPicker.SelectedIndex == -1 || EndLocationPicker.SelectedIndex == -1)
            {
                return;
            }

            string startLocation = StartLocationPicker.SelectedItem.ToString();
            string endLocation = EndLocationPicker.SelectedItem.ToString();

            // Check if there's a direct match in fareMatrix, even for the same location
            if (fareMatrix.TryGetValue((startLocation, endLocation), out var fare) ||
                fareMatrix.TryGetValue((endLocation, startLocation), out fare)) // Check both directions
            {
                FarePriceLabel.Text = $"Regular Price: {fare.Regular}";
                DiscountedFarePriceLabel.Text = $"Student/Senior/PWD: {fare.Discounted}";
            }
            else
            {
                FarePriceLabel.Text = "Regular Price: N/A";
                DiscountedFarePriceLabel.Text = "Student/Senior/PWD: N/A";
            }
        }



        private void StartLocationUpdates()
        {
            locationUpdateTimer = new System.Timers.Timer(3000); // Set interval in milliseconds (e.g., 3000ms = 3 seconds)
            locationUpdateTimer.Elapsed += async (sender, e) => await UpdateMapToUserLocation();
            locationUpdateTimer.AutoReset = true;
            locationUpdateTimer.Enabled = true;
        }

        private bool initialLocationSet = false;  // Flag to check if the map was centered initially

        private async Task UpdateMapToUserLocation()
        {
            try
            {
                var userLocation = await Geolocation.GetLocationAsync(new GeolocationRequest
                {
                    DesiredAccuracy = GeolocationAccuracy.Best,
                    Timeout = TimeSpan.FromSeconds(10)
                });

                if (userLocation != null)
                {
                    Microsoft.Maui.ApplicationModel.MainThread.BeginInvokeOnMainThread(() =>
                    {
                        // Only set the map region once, at the start
                        if (!initialLocationSet)
                        {
                            map.MoveToRegion(MapSpan.FromCenterAndRadius(
                                new Location(userLocation.Latitude, userLocation.Longitude),
                                new Microsoft.Maui.Maps.Distance(500)));

                            initialLocationSet = true;
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"An error occurred while retrieving location: {ex.Message}", "OK");
            }
        }



        private async void LoadVehicles()
        {
            try
            {
                Console.WriteLine("Attempting to load vehicles...");
                List<VehicleModel> vehicles = await _vehicleService.GetVehiclesAsync();
                if (vehicles == null || vehicles.Count == 0)
                {
                    Console.WriteLine("No vehicles found.");
                    await DisplayAlert("Info", "No vehicles available.", "OK");
                    return;
                }


                Device.BeginInvokeOnMainThread(() =>
                {
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

        private void OnVehicleRefreshTimerElapsed(object sender, ElapsedEventArgs e)
        {
            LoadVehicles();
        }


        private async void UpdatePins(List<VehicleModel> vehicles)
        {
            map.Pins.Clear(); // Clear existing pins to avoid duplication

            foreach (var vehicle in vehicles)
            {
                var vehicleLocation = new Location(vehicle.CurrentLat, vehicle.CurrentLong);

                // Get the user's location to calculate ETA
                var userLocation = await Geolocation.GetLastKnownLocationAsync();
                if (userLocation != null)
                {
                    var distance = userLocation.CalculateDistance(vehicleLocation, DistanceUnits.Kilometers);
                    const double averageSpeedKmH = 18.0;
                    double etaMinutes = (distance / averageSpeedKmH) * 60;

                    // Create a pin with ETA, PUV number, and passenger count
                    var pin = new Pin
                    {
                        Label = $"Plate No: {vehicle.PuvNo} | ETA: {etaMinutes:F1} mins | Passengers: {vehicle.PassengerCount}/{vehicle.MaxPassengerCount}",
                        Location = vehicleLocation,
                        Type = PinType.Place,
                        BindingContext = vehicle
                    };

                    map.Pins.Add(pin); // Add each vehicle pin to the map
                }
                else
                {
                    // If user location is unavailable, set default ETA message
                    var pin = new Pin
                    {
                        Label = $"Plate No: {vehicle.PuvNo} | ETA: N/A | Passengers: {vehicle.PassengerCount}/{vehicle.MaxPassengerCount}",
                        Location = vehicleLocation,
                        Type = PinType.Place,
                        BindingContext = vehicle
                    };

                    map.Pins.Add(pin);
                }
            }
        }




        private void UpdateStandingPassengerCount(int currentPassengerCount, int maxPassengerCount)
        {
            int standingPassengers = 0;

            if (currentPassengerCount > maxPassengerCount)
            {
                standingPassengers = Math.Min(currentPassengerCount - maxPassengerCount, 10); // Limit to 10 standing passengers
            }

            // Update the standing passenger label
            StandingPassengerCountLabel.Text = $"Standing Passengers: {standingPassengers}/10";
        }

        private async void LoadFareMatrixInBottomSheet()
        {
            try
            {
                var fareMatrixService = new FareMatrixService();
                var fareMatrixList = await fareMatrixService.GetFareMatrixAsync();
                FareMatrixCollection.ItemsSource = fareMatrixList;
                ScrollableContent.IsVisible = true;
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
                Overlay.IsVisible = false;

            }
        }

        private bool isToggled = false;

        private async void OnLocationToggled(object sender, EventArgs e)
        {
            isToggled = !isToggled;

            ToggleImage.Source = isToggled ? "Images/toggleon.svg" : "Images/toggleoff.svg";

            map.Pins.Clear();
            map.MapElements.Clear();
            LocationLabel.Text = isToggled ? "Cubao" : "Montalban";

            var filteredLocations = isToggled
                ? allLocations.Where(loc => /* Define criteria for Cubao */ true).ToList()
                : allLocations.Where(loc => /* Define criteria for Montalban */ true).ToList();


            if (isToggled)
            {
                DrawCubaoPolyline();
            }
            else
            {
                DrawMontalbanPolyline();
            }
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
                    Radius = new Microsoft.Maui.Maps.Distance(15),
                    StrokeColor = Microsoft.Maui.Graphics.Colors.Yellow,
                    StrokeWidth = 5,
                    FillColor = Microsoft.Maui.Graphics.Colors.Yellow.WithAlpha(0.5f)
                };
                map.MapElements.Add(yellowCircle);
            }
            var centerLocation = new Location(14.658330, 121.103572);
            map.MoveToRegion(MapSpan.FromCenterAndRadius(centerLocation, new Microsoft.Maui.Maps.Distance(6000)));

        }

        private void DrawCubaoPolyline()
        {
            var cubaoPolyline = new Polyline
            {
                StrokeColor = Colors.Blue,
                StrokeWidth = 20
            };

            cubaoPolyline.Geopath.Add(new Location(14.729193, 121.142264));
            cubaoPolyline.Geopath.Add(new Location(14.728758, 121.144023));
            cubaoPolyline.Geopath.Add(new Location(14.727637, 121.143701));
            cubaoPolyline.Geopath.Add(new Location(14.726952, 121.143315));
            cubaoPolyline.Geopath.Add(new Location(14.726246, 121.142822));
            cubaoPolyline.Geopath.Add(new Location(14.724503, 121.142350));
            cubaoPolyline.Geopath.Add(new Location(14.723824, 121.141706));
            cubaoPolyline.Geopath.Add(new Location(14.722983, 121.141523));
            cubaoPolyline.Geopath.Add(new Location(14.722018, 121.140547));
            cubaoPolyline.Geopath.Add(new Location(14.718967, 121.138530));
            cubaoPolyline.Geopath.Add(new Location(14.716342, 121.136878));
            cubaoPolyline.Geopath.Add(new Location(14.714640, 121.135773));
            cubaoPolyline.Geopath.Add(new Location(14.714080, 121.135505));
            cubaoPolyline.Geopath.Add(new Location(14.713602, 121.134850));
            cubaoPolyline.Geopath.Add(new Location(14.711569, 121.133777));
            cubaoPolyline.Geopath.Add(new Location(14.710430, 121.133316));
            cubaoPolyline.Geopath.Add(new Location(14.709392, 121.132345));
            cubaoPolyline.Geopath.Add(new Location(14.708686, 121.131835));
            cubaoPolyline.Geopath.Add(new Location(14.708065, 121.131535));
            cubaoPolyline.Geopath.Add(new Location(14.707445, 121.130811));
            cubaoPolyline.Geopath.Add(new Location(14.707240, 121.130081));
            cubaoPolyline.Geopath.Add(new Location(14.707381, 121.129098));
            cubaoPolyline.Geopath.Add(new Location(14.705856, 121.127923));
            cubaoPolyline.Geopath.Add(new Location(14.704956, 121.127290));
            cubaoPolyline.Geopath.Add(new Location(14.704254, 121.126893));
            cubaoPolyline.Geopath.Add(new Location(14.703321, 121.126424));
            cubaoPolyline.Geopath.Add(new Location(14.702361, 121.126177));
            cubaoPolyline.Geopath.Add(new Location(14.701378, 121.125600));
            cubaoPolyline.Geopath.Add(new Location(14.700924, 121.125303));
            cubaoPolyline.Geopath.Add(new Location(14.701151, 121.124507));
            cubaoPolyline.Geopath.Add(new Location(14.699440, 121.123576));
            cubaoPolyline.Geopath.Add(new Location(14.698345, 121.122307));
            cubaoPolyline.Geopath.Add(new Location(14.696356, 121.119973));
            cubaoPolyline.Geopath.Add(new Location(14.695376, 121.118820));
            cubaoPolyline.Geopath.Add(new Location(14.695379, 121.117667));
            cubaoPolyline.Geopath.Add(new Location(14.693682, 121.117398));
            cubaoPolyline.Geopath.Add(new Location(14.691414, 121.117007));
            cubaoPolyline.Geopath.Add(new Location(14.690148, 121.116798));
            cubaoPolyline.Geopath.Add(new Location(14.688918, 121.116615));
            cubaoPolyline.Geopath.Add(new Location(14.688145, 121.116503));
            cubaoPolyline.Geopath.Add(new Location(14.687408, 121.116401));
            cubaoPolyline.Geopath.Add(new Location(14.686090, 121.116175));
            cubaoPolyline.Geopath.Add(new Location(14.684435, 121.116009));
            cubaoPolyline.Geopath.Add(new Location(14.683880, 121.115955));
            cubaoPolyline.Geopath.Add(new Location(14.683070, 121.115569));
            cubaoPolyline.Geopath.Add(new Location(14.681752, 121.114872));
            cubaoPolyline.Geopath.Add(new Location(14.680538, 121.113971));
            cubaoPolyline.Geopath.Add(new Location(14.679214, 121.112774));
            cubaoPolyline.Geopath.Add(new Location(14.678670, 121.112420));
            cubaoPolyline.Geopath.Add(new Location(14.675442, 121.109888));
            cubaoPolyline.Geopath.Add(new Location(14.673193, 121.109357));
            cubaoPolyline.Geopath.Add(new Location(14.662938, 121.106181));
            cubaoPolyline.Geopath.Add(new Location(14.657546, 121.103714));
            cubaoPolyline.Geopath.Add(new Location(14.657502, 121.104588));
            cubaoPolyline.Geopath.Add(new Location(14.653510, 121.104401));
            cubaoPolyline.Geopath.Add(new Location(14.652894, 121.104157));
            cubaoPolyline.Geopath.Add(new Location(14.652765, 121.104495));
            cubaoPolyline.Geopath.Add(new Location(14.652204, 121.104245));
            cubaoPolyline.Geopath.Add(new Location(14.651153, 121.103762));
            cubaoPolyline.Geopath.Add(new Location(14.650713, 121.103681));
            cubaoPolyline.Geopath.Add(new Location(14.644637, 121.100788));
            cubaoPolyline.Geopath.Add(new Location(14.642386, 121.099726));
            cubaoPolyline.Geopath.Add(new Location(14.640237, 121.098717));
            cubaoPolyline.Geopath.Add(new Location(14.638900, 121.098218));
            cubaoPolyline.Geopath.Add(new Location(14.638358, 121.098095));
            cubaoPolyline.Geopath.Add(new Location(14.637744, 121.097960));
            cubaoPolyline.Geopath.Add(new Location(14.637823, 121.097445));
            cubaoPolyline.Geopath.Add(new Location(14.637826, 121.096796));
            cubaoPolyline.Geopath.Add(new Location(14.637639, 121.095900));
            cubaoPolyline.Geopath.Add(new Location(14.636445, 121.096119));
            cubaoPolyline.Geopath.Add(new Location(14.635746, 121.096187));
            cubaoPolyline.Geopath.Add(new Location(14.636233, 121.090858));
            cubaoPolyline.Geopath.Add(new Location(14.636235, 121.090654));
            cubaoPolyline.Geopath.Add(new Location(14.636171, 121.090374));
            cubaoPolyline.Geopath.Add(new Location(14.634897, 121.087764));
            cubaoPolyline.Geopath.Add(new Location(14.633610, 121.085141));
            cubaoPolyline.Geopath.Add(new Location(14.632543, 121.081549));
            cubaoPolyline.Geopath.Add(new Location(14.632299, 121.079999));
            cubaoPolyline.Geopath.Add(new Location(14.632222, 121.079387));
            cubaoPolyline.Geopath.Add(new Location(14.632037, 121.078336));
            cubaoPolyline.Geopath.Add(new Location(14.632172, 121.077770));
            cubaoPolyline.Geopath.Add(new Location(14.632590, 121.077298));
            cubaoPolyline.Geopath.Add(new Location(14.632754, 121.076721));
            cubaoPolyline.Geopath.Add(new Location(14.632751, 121.076147));
            cubaoPolyline.Geopath.Add(new Location(14.632728, 121.076016));
            cubaoPolyline.Geopath.Add(new Location(14.631915, 121.074393));
            cubaoPolyline.Geopath.Add(new Location(14.630333, 121.071107));
            cubaoPolyline.Geopath.Add(new Location(14.628524, 121.067303));
            cubaoPolyline.Geopath.Add(new Location(14.627853, 121.063532));
            cubaoPolyline.Geopath.Add(new Location(14.627669, 121.062816));
            cubaoPolyline.Geopath.Add(new Location(14.627352, 121.062052));
            cubaoPolyline.Geopath.Add(new Location(14.626563, 121.060432));
            cubaoPolyline.Geopath.Add(new Location(14.623542, 121.061827));
            cubaoPolyline.Geopath.Add(new Location(14.621162, 121.062975));
            cubaoPolyline.Geopath.Add(new Location(14.620669, 121.061301));
            cubaoPolyline.Geopath.Add(new Location(14.620114, 121.059488));
            cubaoPolyline.Geopath.Add(new Location(14.619683, 121.058286));
            cubaoPolyline.Geopath.Add(new Location(14.619444, 121.057814));
            cubaoPolyline.Geopath.Add(new Location(14.619685, 121.057629));
            cubaoPolyline.Geopath.Add(new Location(14.619952, 121.057313));
            cubaoPolyline.Geopath.Add(new Location(14.620310, 121.057071));
            cubaoPolyline.Geopath.Add(new Location(14.620873, 121.056682));
            cubaoPolyline.Geopath.Add(new Location(14.620434, 121.055856));
            cubaoPolyline.Geopath.Add(new Location(14.620362, 121.055671));
            cubaoPolyline.Geopath.Add(new Location(14.621585, 121.055097));

            // Add remaining coordinates as needed...

            // Add the polyline to the map
            map.MapElements.Add(cubaoPolyline);
        }

        private void DrawMontalbanPolyline()
        {
            var montalbanPolyline = new Polyline
            {
                StrokeColor = Colors.Blue, // Set the polyline color
                StrokeWidth = 20 // Set the stroke width
            };

            montalbanPolyline.Geopath.Add(new Location(14.735306, 121.154543));
            montalbanPolyline.Geopath.Add(new Location(14.735357, 121.153867));
            montalbanPolyline.Geopath.Add(new Location(14.735268, 121.152360));
            montalbanPolyline.Geopath.Add(new Location(14.735221, 121.151207));
            montalbanPolyline.Geopath.Add(new Location(14.735207, 121.150756));
            montalbanPolyline.Geopath.Add(new Location(14.735309, 121.148798));
            montalbanPolyline.Geopath.Add(new Location(14.735382, 121.146213));
            montalbanPolyline.Geopath.Add(new Location(14.734002, 121.145784));
            montalbanPolyline.Geopath.Add(new Location(14.733685, 121.145612));
            montalbanPolyline.Geopath.Add(new Location(14.730835, 121.144834));
            montalbanPolyline.Geopath.Add(new Location(14.729726, 121.144426));
            montalbanPolyline.Geopath.Add(new Location(14.729072, 121.144204));
            montalbanPolyline.Geopath.Add(new Location(14.728883, 121.144109));
            montalbanPolyline.Geopath.Add(new Location(14.729303, 121.142188));
            montalbanPolyline.Geopath.Add(new Location(14.729189, 121.142172));
            montalbanPolyline.Geopath.Add(new Location(14.729193, 121.142264));
            montalbanPolyline.Geopath.Add(new Location(14.728758, 121.144023));
            montalbanPolyline.Geopath.Add(new Location(14.727637, 121.143701));
            montalbanPolyline.Geopath.Add(new Location(14.726952, 121.143315));
            montalbanPolyline.Geopath.Add(new Location(14.726246, 121.142822));
            montalbanPolyline.Geopath.Add(new Location(14.724503, 121.142350));
            montalbanPolyline.Geopath.Add(new Location(14.723824, 121.141706));
            montalbanPolyline.Geopath.Add(new Location(14.722983, 121.141523));
            montalbanPolyline.Geopath.Add(new Location(14.722018, 121.140547));
            montalbanPolyline.Geopath.Add(new Location(14.718967, 121.138530));
            montalbanPolyline.Geopath.Add(new Location(14.716342, 121.136878));
            montalbanPolyline.Geopath.Add(new Location(14.714640, 121.135773));
            montalbanPolyline.Geopath.Add(new Location(14.714080, 121.135505));
            montalbanPolyline.Geopath.Add(new Location(14.713602, 121.134850));
            montalbanPolyline.Geopath.Add(new Location(14.711569, 121.133777));
            montalbanPolyline.Geopath.Add(new Location(14.710430, 121.133316));
            montalbanPolyline.Geopath.Add(new Location(14.709392, 121.132345));
            montalbanPolyline.Geopath.Add(new Location(14.708686, 121.131835));
            montalbanPolyline.Geopath.Add(new Location(14.708065, 121.131535));
            montalbanPolyline.Geopath.Add(new Location(14.707445, 121.130811));
            montalbanPolyline.Geopath.Add(new Location(14.707240, 121.130081));
            montalbanPolyline.Geopath.Add(new Location(14.707381, 121.129098));
            montalbanPolyline.Geopath.Add(new Location(14.705856, 121.127923));
            montalbanPolyline.Geopath.Add(new Location(14.704956, 121.127290));
            montalbanPolyline.Geopath.Add(new Location(14.704254, 121.126893));
            montalbanPolyline.Geopath.Add(new Location(14.703321, 121.126424));
            montalbanPolyline.Geopath.Add(new Location(14.702361, 121.126177));
            montalbanPolyline.Geopath.Add(new Location(14.701378, 121.125600));
            montalbanPolyline.Geopath.Add(new Location(14.700924, 121.125303));
            montalbanPolyline.Geopath.Add(new Location(14.701151, 121.124507));
            montalbanPolyline.Geopath.Add(new Location(14.699440, 121.123576));
            montalbanPolyline.Geopath.Add(new Location(14.698345, 121.122307));
            montalbanPolyline.Geopath.Add(new Location(14.696916, 121.120638));
            montalbanPolyline.Geopath.Add(new Location(14.696474, 121.120949));
            montalbanPolyline.Geopath.Add(new Location(14.694896, 121.119136));
            montalbanPolyline.Geopath.Add(new Location(14.694785, 121.118942));
            montalbanPolyline.Geopath.Add(new Location(14.694800, 121.118577));
            montalbanPolyline.Geopath.Add(new Location(14.694922, 121.117601));
            montalbanPolyline.Geopath.Add(new Location(14.693682, 121.117398));
            montalbanPolyline.Geopath.Add(new Location(14.691414, 121.117007));
            montalbanPolyline.Geopath.Add(new Location(14.690148, 121.116798));
            montalbanPolyline.Geopath.Add(new Location(14.688918, 121.116615));
            montalbanPolyline.Geopath.Add(new Location(14.688145, 121.116503));
            montalbanPolyline.Geopath.Add(new Location(14.687408, 121.116401));
            montalbanPolyline.Geopath.Add(new Location(14.686090, 121.116175));
            montalbanPolyline.Geopath.Add(new Location(14.684435, 121.116009));
            montalbanPolyline.Geopath.Add(new Location(14.683880, 121.115955));
            montalbanPolyline.Geopath.Add(new Location(14.683070, 121.115569));
            montalbanPolyline.Geopath.Add(new Location(14.681752, 121.114872));
            montalbanPolyline.Geopath.Add(new Location(14.680538, 121.113971));
            montalbanPolyline.Geopath.Add(new Location(14.679214, 121.112774));
            montalbanPolyline.Geopath.Add(new Location(14.678670, 121.112420));
            montalbanPolyline.Geopath.Add(new Location(14.675442, 121.109888));
            montalbanPolyline.Geopath.Add(new Location(14.673193, 121.109357));
            montalbanPolyline.Geopath.Add(new Location(14.662938, 121.106181));
            montalbanPolyline.Geopath.Add(new Location(14.657546, 121.103714));
            montalbanPolyline.Geopath.Add(new Location(14.657534, 121.104170));
            montalbanPolyline.Geopath.Add(new Location(14.655940, 121.103991));
            montalbanPolyline.Geopath.Add(new Location(14.654281, 121.103877));
            montalbanPolyline.Geopath.Add(new Location(14.653585, 121.103899));
            montalbanPolyline.Geopath.Add(new Location(14.652942, 121.103829));
            montalbanPolyline.Geopath.Add(new Location(14.652683, 121.103909));
            montalbanPolyline.Geopath.Add(new Location(14.652612, 121.104023));
            montalbanPolyline.Geopath.Add(new Location(14.650735, 121.103083));
            montalbanPolyline.Geopath.Add(new Location(14.650770, 121.103309));
            montalbanPolyline.Geopath.Add(new Location(14.650892, 121.103711));
            montalbanPolyline.Geopath.Add(new Location(14.650933, 121.104014));
            montalbanPolyline.Geopath.Add(new Location(14.650900, 121.104366));
            montalbanPolyline.Geopath.Add(new Location(14.650871, 121.104564));
            montalbanPolyline.Geopath.Add(new Location(14.650394, 121.104397));
            montalbanPolyline.Geopath.Add(new Location(14.649490, 121.103972));
            montalbanPolyline.Geopath.Add(new Location(14.648660, 121.103593));
            montalbanPolyline.Geopath.Add(new Location(14.639115, 121.099035));
            montalbanPolyline.Geopath.Add(new Location(14.638321, 121.098660));
            montalbanPolyline.Geopath.Add(new Location(14.638260, 121.098541));
            montalbanPolyline.Geopath.Add(new Location(14.638284, 121.098309));
            montalbanPolyline.Geopath.Add(new Location(14.638358, 121.098095));
            montalbanPolyline.Geopath.Add(new Location(14.637744, 121.097960));
            montalbanPolyline.Geopath.Add(new Location(14.637823, 121.097445));
            montalbanPolyline.Geopath.Add(new Location(14.637272, 121.097348));
            montalbanPolyline.Geopath.Add(new Location(14.636597, 121.097315));
            montalbanPolyline.Geopath.Add(new Location(14.635616, 121.097336));
            montalbanPolyline.Geopath.Add(new Location(14.635746, 121.096187));
            montalbanPolyline.Geopath.Add(new Location(14.636233, 121.090858));
            montalbanPolyline.Geopath.Add(new Location(14.636235, 121.090654));
            montalbanPolyline.Geopath.Add(new Location(14.636171, 121.090374));
            montalbanPolyline.Geopath.Add(new Location(14.634897, 121.087764));
            montalbanPolyline.Geopath.Add(new Location(14.633610, 121.085141));
            montalbanPolyline.Geopath.Add(new Location(14.632543, 121.081549));
            montalbanPolyline.Geopath.Add(new Location(14.632299, 121.079999));
            montalbanPolyline.Geopath.Add(new Location(14.632222, 121.079387));
            montalbanPolyline.Geopath.Add(new Location(14.632037, 121.078336));
            montalbanPolyline.Geopath.Add(new Location(14.632172, 121.077770));
            montalbanPolyline.Geopath.Add(new Location(14.632590, 121.077298));
            montalbanPolyline.Geopath.Add(new Location(14.632754, 121.076721));
            montalbanPolyline.Geopath.Add(new Location(14.632751, 121.076147));
            montalbanPolyline.Geopath.Add(new Location(14.632728, 121.076016));
            montalbanPolyline.Geopath.Add(new Location(14.631915, 121.074393));
            montalbanPolyline.Geopath.Add(new Location(14.630333, 121.071107));
            montalbanPolyline.Geopath.Add(new Location(14.628524, 121.067303));
            montalbanPolyline.Geopath.Add(new Location(14.627853, 121.063532));
            montalbanPolyline.Geopath.Add(new Location(14.627669, 121.062816));
            montalbanPolyline.Geopath.Add(new Location(14.627352, 121.062052));
            montalbanPolyline.Geopath.Add(new Location(14.626563, 121.060432));
            montalbanPolyline.Geopath.Add(new Location(14.623256, 121.053996));
            montalbanPolyline.Geopath.Add(new Location(14.622843, 121.054213));
            montalbanPolyline.Geopath.Add(new Location(14.622654, 121.054373));
            montalbanPolyline.Geopath.Add(new Location(14.622287, 121.054737));
            montalbanPolyline.Geopath.Add(new Location(14.621585, 121.055097));


            map.MapElements.Add(montalbanPolyline);
        }


        public class CustomPin
        {
            public Pin Pin { get; set; }
            public string Icon { get; set; }
        }

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

            var region = CalculateMapRegion(new List<Location> { start, end });
            map.MoveToRegion(region);
        }

        private bool IsPointWithinRange(Location point, Location start, Location end)
        {
            return true;
        }

        private MapSpan CalculateMapRegion(List<Location> points)
        {
            var minLat = points.Min(p => p.Latitude);
            var maxLat = points.Max(p => p.Latitude);
            var minLng = points.Min(p => p.Longitude);
            var maxLng = points.Max(p => p.Longitude);

            var centerLat = (minLat + maxLat) / 2;
            var centerLng = (minLng + maxLng) / 2;

            var spanLat = Math.Abs(maxLat - minLat) * 1.2;
            var spanLng = Math.Abs(maxLng - minLng) * 1.2;

            return new MapSpan(new Location(centerLat, centerLng), spanLat, spanLng);
        }


        private void ClearPolylines()
        {
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

        private async void OnZoomToUserLocationClicked(object sender, EventArgs e)
        {
            try
            {
                var userLocation = await Geolocation.GetLastKnownLocationAsync();
                if (userLocation != null)
                {
                    // Define a map span with a smaller zoom level to focus on user's location
                    var mapSpan = MapSpan.FromCenterAndRadius(new Location(userLocation.Latitude, userLocation.Longitude), Distance.FromMiles(0.5));
                    map.MoveToRegion(mapSpan);
                }
                else
                {
                    await DisplayAlert("Location Error", "Unable to retrieve your location. Please check your location settings.", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"An error occurred while getting your location: {ex.Message}", "OK");
            }
        }

        //var userLocation = new Location(14.6505, 121.1035);//var userLocation = await Geolocation.GetLastKnownLocationAsync();
        private async void OnToggleBottomSheetClicked(object sender, EventArgs e)
        {
            // Attempt to retrieve the user's last known location
            var userLocation = await Geolocation.GetLastKnownLocationAsync();
            if (userLocation == null)
            {
                await DisplayAlert("Error", "User location could not be determined.", "OK");
                return;
            }

            // Find the nearest vehicle to the user's location
            List<VehicleModel> vehicles = await _vehicleService.GetVehiclesAsync();
            if (vehicles == null || vehicles.Count == 0)
            {
                await DisplayAlert("Info", "No vehicles available.", "OK");
                return;
            }

            // Identify the closest vehicle
            SelectedVehicle = vehicles
                .OrderBy(vehicle => userLocation.CalculateDistance(new Location(vehicle.CurrentLat, vehicle.CurrentLong), DistanceUnits.Kilometers))
                .FirstOrDefault();

            if (!BottomSheet.IsVisible)
            {
                // Show the BottomSheet
                BottomSheet.IsVisible = true;
                await BottomSheet.FadeTo(1, 250);
                await SlideDown(FrameLayout);
                map.IsTrafficEnabled = false;
                BottomSheet.TranslationY = this.Height;
                await BottomSheet.TranslateTo(0, 0, 300, Easing.CubicInOut);
                ScrollableContent.IsVisible = true;
                LoadFareMatrixInBottomSheet();

                // Calculate ETA for the closest vehicle
                var vehicleLocation = new Location(SelectedVehicle.CurrentLat, SelectedVehicle.CurrentLong);
                var distance = userLocation.CalculateDistance(vehicleLocation, DistanceUnits.Kilometers);
                const double averageSpeedKmH = 18.0;
                double etaMinutes = (distance / averageSpeedKmH) * 60;

                // Update the BottomSheet labels with vehicle information
                ETALabel.Text = $"ETA: {etaMinutes:F1} mins";
                PuvNoLabel.Text = $"PUV No: {SelectedVehicle.PuvNo}";
                PassengerCountLabel.Text = $"Passenger Count: {SelectedVehicle.PassengerCount}/{SelectedVehicle.MaxPassengerCount}";
            }
            else
            {
                // Hide the BottomSheet if it’s already visible
                await BottomSheet.TranslateTo(0, this.Height, 300, Easing.CubicInOut);
                await BottomSheet.FadeTo(0, 250);
                map.IsTrafficEnabled = true;
                BottomSheet.IsVisible = false;
                ScrollableContent.IsVisible = false;
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


        private void StartPassengerCountMonitor()
        {
            passengerCountCheckTimer = new System.Timers.Timer(1000); // Set interval (e.g., 1 second)
            passengerCountCheckTimer.Elapsed += OnPassengerCountCheck;
            passengerCountCheckTimer.AutoReset = true;
            passengerCountCheckTimer.Enabled = true;
        }

        private void OnPassengerCountCheck(object sender, System.Timers.ElapsedEventArgs e)
        {
            // Assuming SelectedVehicle is an existing property with a PassengerCount
            passengerCount = SelectedVehicle?.PassengerCount ?? 0;

            UpdateStandingPassengerCount(passengerCount, SelectedVehicle?.MaxPassengerCount ?? 0);

            // Use the MainThread to update UI elements as timers run on a background thread
            Microsoft.Maui.ApplicationModel.MainThread.BeginInvokeOnMainThread(() =>
            {
                SetButtonStrokeColor(passengerCount);
            });
        }

        private void SetButtonStrokeColor(int count)
        {
            Color strokeColor;
            
            if (count >= 0 && count <= 15)
            {
                strokeColor = Colors.LimeGreen;
            }
            else if (count >= 16 && count <= 25)
            {
                strokeColor = Colors.Orange;
            }
            else if (count >= 26 && count <= 30)
            {
                strokeColor = Colors.Red;
            }
            else
            {
                strokeColor = Colors.DarkRed; // Default for zero passengers
            }

            // Set the border color of the frame
            // Set the border color of the outer frame
            OuterFrame.BorderColor = strokeColor;

            ToggleBottomSheetFrame.BorderColor = strokeColor;
        }

        protected override void OnDisappearing()
        {
            // Stop the timer when the page is no longer visible
            passengerCountCheckTimer?.Stop();
            base.OnDisappearing();
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

        private async void OnSettingsClickes(object sender, EventArgs e)
        {
            // Navigate to SettingsPage
            await Navigation.PushAsync(new AdminSettingsPage());
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