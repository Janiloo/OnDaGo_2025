using Microsoft.Maui.Controls.Maps;
using Microsoft.Maui.Maps.Handlers;
//using Android.Gms.Maps; // Ensure you have Google Maps SDK installed
//using Android.Gms.Maps.Model;
using Microsoft.Maui.Platform; // Needed for accessing platform-specific functionalities
//using Android.Graphics.Drawables; // Needed for BitmapDrawable
//using System.Collections.Generic;
using Microsoft.Maui.Maps;

namespace OnDaGO.MAUI.Handlers
{
    public class CustomMapHandler : MapHandler
    {
       /* public static readonly IPropertyMapper<IMap, IMapHandler> CustomMapper =
            new PropertyMapper<IMap, IMapHandler>(Mapper)
            {
                [nameof(IMap.Pins)] = MapPins,
            };

        public CustomMapHandler() : base(CustomMapper, CommandMapper) { }

        public List<Marker> Markers { get; } = new();

        protected override void ConnectHandler(MapView platformView)
        {
            base.ConnectHandler(platformView);
            var mapReady = new MapCallbackHandler(this);
            platformView.GetMapAsync(mapReady); // Ensure platformView is the correct type
        }

        private static new void MapPins(IMapHandler handler, IMap map)
        {
            if (handler is CustomMapHandler mapHandler)
            {
                foreach (var marker in mapHandler.Markers)
                {
                    marker.Remove();
                }
                mapHandler.Markers.Clear();
                mapHandler.AddPins(map.Pins);
            }
        }

        private void AddPins(IEnumerable<IMapPin> mapPins)
        {
            if (MauiContext is null) return;

            foreach (var pin in mapPins)
            {
                var pinHandler = pin.ToHandler(MauiContext);
                if (pinHandler is IMapPinHandler mapPinHandler)
                {
                    var markerOption = mapPinHandler.PlatformView;

                    if (pin is CustomPin cp)
                    {
                        cp.ImageSource?.LoadImage(MauiContext, result =>
                        {
                            if (result?.Value is BitmapDrawable bitmapDrawable)
                            {
                                markerOption.SetIcon(BitmapDescriptorFactory.FromBitmap(bitmapDrawable.Bitmap));
                            }
                            AddMarker(Map, pin, Markers, markerOption);
                        });
                    }
                    else
                    {
                        AddMarker(Map, pin, Markers, markerOption);
                    }
                }
            }
        }

        private static void AddMarker(GoogleMap map, IMapPin pin, List<Marker> markers, MarkerOptions markerOption)
        {
            var marker = map.AddMarker(markerOption);
            pin.MarkerId = marker.Id;
            markers.Add(marker);
        }
    }

    // Callback handler for when the map is ready
    class MapCallbackHandler : Java.Lang.Object, IOnMapReadyCallback
    {
        private readonly IMapHandler mapHandler;

        public MapCallbackHandler(IMapHandler mapHandler)
        {
            this.mapHandler = mapHandler;
        }

        public void OnMapReady(GoogleMap googleMap)
        {
            mapHandler.UpdateValue(nameof(IMap.Pins));
        }*/
    }
}
