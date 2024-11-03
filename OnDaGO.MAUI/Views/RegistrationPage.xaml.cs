using OnDaGO.MAUI.Models;
using Refit;
using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using OnDaGO.MAUI.Services;
using System.Threading.Tasks;
using Microsoft.Maui.ApplicationModel;

namespace OnDaGO.MAUI.Views
{
    public partial class RegistrationPage : ContentPage
    {
        private string DocumentImageBase64 { get; set; }
        private string SelfieImage { get; set; }

        public RegistrationPage()
        {
            InitializeComponent();
        }

        private async void OnDocumentFrontClicked(object sender, EventArgs e)
        {
            if (await RequestCameraPermissionAsync())
            {
                await CaptureImageAsync((image) =>
                {
                    DocumentImageBase64 = image;
                    DocumentImageFrontPreview.Source = ImageSource.FromStream(() => new MemoryStream(Convert.FromBase64String(image)));
                    DocumentImageFrontPreview.IsVisible = true;
                });
            }
        }

        private async void OnSelfieImageClicked(object sender, EventArgs e)
        {
            if (await RequestCameraPermissionAsync())
            {
                await CaptureImageAsync((image) =>
                {
                    SelfieImage = image;
                    SelfieImagePreview.Source = ImageSource.FromStream(() => new MemoryStream(Convert.FromBase64String(image)));
                    SelfieImagePreview.IsVisible = true;
                });
            }
        }

        private async Task<bool> RequestCameraPermissionAsync()
        {
            var status = await Permissions.CheckStatusAsync<Permissions.Camera>();
            if (status != PermissionStatus.Granted)
            {
                status = await Permissions.RequestAsync<Permissions.Camera>();
            }
            return status == PermissionStatus.Granted;
        }

        private async Task CaptureImageAsync(Action<string> onImageCaptured)
        {
            try
            {
                var result = await MediaPicker.CapturePhotoAsync(); // Opens the camera for capturing a photo
                if (result != null)
                {
                    var imageBase64 = await ConvertToBase64(result.FullPath);
                    onImageCaptured(imageBase64);
                }
            }
            catch (Exception ex)
            {
                ShowErrorMessage($"Error capturing image: {ex.Message}");
            }
        }

        private async Task<string> ConvertToBase64(string filePath)
        {
            var imageBytes = await File.ReadAllBytesAsync(filePath);
            return Convert.ToBase64String(imageBytes);
        }

        private async void OnRegisterClicked(object sender, EventArgs e)
        {
            ErrorLabel.IsVisible = false;
            ErrorLabel.Text = string.Empty;

            var user = new UserItem
            {
                Name = NameEntry.Text,
                Email = EmailEntry.Text,
                PasswordHash = HashPassword(PasswordEntry.Text),
                PhoneNumber = PhoneNumberEntry.Text,
                DocumentImageBase64 = DocumentImageBase64,
                SelfieImage = SelfieImage
            };

            // Input validation
            if (string.IsNullOrWhiteSpace(user.Name) ||
                string.IsNullOrWhiteSpace(user.Email) ||
                string.IsNullOrWhiteSpace(user.PhoneNumber) ||
                string.IsNullOrWhiteSpace(user.DocumentImageBase64) ||
                string.IsNullOrWhiteSpace(user.SelfieImage))
            {
                ShowErrorMessage("All fields must be filled out.");
                return;
            }

            // Validate password
            if (string.IsNullOrWhiteSpace(PasswordEntry.Text) || PasswordEntry.Text.Length < 6)
            {
                ShowErrorMessage("Password must be at least 6 characters long.");
                return;
            }

            if (!PasswordsMatch(PasswordEntry.Text, ConfirmPasswordEntry.Text))
            {
                ShowErrorMessage("Passwords do not match.");
                return;
            }

            if (!IsValidPhoneNumber(user.PhoneNumber))
            {
                ShowErrorMessage("Phone number must be 11 digits.");
                return;
            }

            try
            {
                var result = await App.AuthApi.Register(user);
                await DisplayAlert("Success", "Registration successful!", "OK");
                await Navigation.PushAsync(new LoginPage());
            }
            catch (ApiException ex)
            {
                ShowErrorMessage($"Registration failed: {ex.Content}");
            }
            catch (Exception ex)
            {
                ShowErrorMessage($"An unexpected error occurred: {ex.Message}");
            }
        }

        private string HashPassword(string password)
        {
            // Hashing the password securely
            using (var sha256 = SHA256.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(password);
                var hash = sha256.ComputeHash(bytes);
                return Convert.ToBase64String(hash);
            }
        }

        private void ShowErrorMessage(string message)
        {
            ErrorLabel.Text = message;
            ErrorLabel.IsVisible = true;
        }

        private bool IsValidEmail(string email) =>
            !string.IsNullOrWhiteSpace(email) &&
            new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$").IsMatch(email);

        private bool IsValidPhoneNumber(string phoneNumber) =>
            Regex.IsMatch(phoneNumber, @"^\d{11}$");

        private bool PasswordsMatch(string password, string confirmPassword) =>
            password == confirmPassword;

        private void OnShowPasswordCheckedChanged(object sender, CheckedChangedEventArgs e)
        {
            PasswordEntry.IsPassword = !e.Value;
            ConfirmPasswordEntry.IsPassword = !e.Value;
        }

        private async void OnLoginClicked(object sender, EventArgs e)
        {
            await Navigation.PushAsync(new LoginPage());
        }
    }
}
