using Microsoft.Maui.Controls.Maps;

namespace OnDaGO.MAUI.Models
{
    public class CustomPin : Pin
    {
        public static readonly BindableProperty IconProperty =
            BindableProperty.Create(nameof(Icon), typeof(string), typeof(CustomPin), null);

        /// <summary>
        /// Filename of the image in Resources/Images (e.g. "goldenlogo.png" or "bustop.png").
        /// </summary>
        public string? Icon
        {
            get => (string?)GetValue(IconProperty);
            set => SetValue(IconProperty, value);
        }
    }
}
