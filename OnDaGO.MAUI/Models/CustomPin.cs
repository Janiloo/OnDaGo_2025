using Microsoft.Maui.Controls.Maps;

namespace OnDaGO.MAUI.Models
{
    public class CustomPin : Pin
    {
        public static readonly BindableProperty ImageSourceProperty = BindableProperty.Create(
            nameof(ImageSource),
            typeof(ImageSource),
            typeof(CustomPin)
        );

        public ImageSource? ImageSource
        {
            get => (ImageSource?)GetValue(ImageSourceProperty);
            set => SetValue(ImageSourceProperty, value);
        }

        // Add any other properties you may need
        public string Label { get; set; } // Example property
        public Location Location { get; set; } // Location property for the pin
        public PinType Type { get; set; } // Type property for the pin
        public string Address { get; set; } // Address property for the pin
    }
}
