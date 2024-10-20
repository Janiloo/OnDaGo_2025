using Android.Gms.Maps;
using Android.Gms.Maps.Model;
using Microsoft.Maui.Controls.Handlers; // Ensure this is added
using Microsoft.Maui.Controls.Maps;      // Ensure this is added
using Microsoft.Maui.Maps;               // For Map-related functionality
using Microsoft.Maui.Platform;           // For platform-specific features
using OnDaGO.MAUI.Models;                // Assuming you have a CustomPin class in this namespace
using OnDaGO.MAUI.Views;

namespace OnDaGO.MAUI.Platforms.Android
{
    public class CustomMapHandler //: MapHandler
    {
        /*protected override void ConnectHandler(Android.Views.View platformView)
        {
            base.ConnectHandler(platformView);
            var mapView = (MapView)platformView;
            mapView.GetMapAsync(new OnMapReadyCallback((googleMap) =>
            {
                foreach (var pin in Map.Pins)
                {
                    if (pin is CustomPin customPin && customPin.ImageSource is not null)
                    {
                        var markerOptions = new MarkerOptions();
                        markerOptions.SetPosition(new LatLng(pin.Location.Latitude, pin.Location.Longitude));
                        markerOptions.SetTitle(pin.Label);
                        markerOptions.SetSnippet(pin.Address);
                        var icon = BitmapDescriptorFactory.FromAsset("Resources/Images/bustop.png");
                        markerOptions.SetIcon(icon);

                        googleMap.AddMarker(markerOptions);
                    }
                }
            }));
        }*/
    }

    /*internal class OnMapReadyCallback : Java.Lang.Object, IOnMapReadyCallback
    {
        private readonly Action<GoogleMap> _callback;

        public OnMapReadyCallback(Action<GoogleMap> callback)
        {
            _callback = callback;
        }

        public void OnMapReady(GoogleMap googleMap)
        {
            _callback?.Invoke(googleMap);
        }
    }*/
}
