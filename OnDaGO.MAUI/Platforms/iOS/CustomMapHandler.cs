using CoreLocation;
using MapKit;
using Microsoft.Maui.Controls.Maps;
using Microsoft.Maui.Maps.Handlers;
using Microsoft.Maui.Maps;
using UIKit;

namespace OnDaGO.MAUI.Platforms.iOS
{
    public class CustomMapHandler //: MapHandler
    {
        /*protected override MKAnnotationView GetViewForAnnotation(MKMapView mapView, IMKAnnotation annotation)
        {
            if (annotation is MKUserLocation)
                return null;

            var annotationView = mapView.DequeueReusableAnnotation("customPin");
            if (annotationView == null)
            {
                annotationView = new MKAnnotationView(annotation, "customPin");
                annotationView.Image = UIImage.FromFile("Resources/Images/bustop.png"); // Customize with your image
                annotationView.CanShowCallout = true;
            }

            return annotationView;
        }

        public override void AddPins(IEnumerable<Pin> mapPins)
        {
            foreach (var pin in mapPins)
            {
                var annotation = new MKPointAnnotation
                {
                    Title = pin.Label,
                    Subtitle = pin.Address,
                    Coordinate = new CLLocationCoordinate2D(pin.Location.Latitude, pin.Location.Longitude)
                };
                PlatformView.AddAnnotation(annotation);
            }
        }*/
    }
}
