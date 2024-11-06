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
        private string FaceImageBase64 { get; set; }

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
                    FaceImageBase64 = image;
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
            // Reset all error labels
            ClearErrorMessages();

            bool hasError = false;

            if (string.IsNullOrWhiteSpace(NameEntry.Text))
            {
                ShowErrorMessage(NameErrorLabel, "Name is required.");
                hasError = true;
            }

            if (string.IsNullOrWhiteSpace(EmailEntry.Text) || !IsValidEmail(EmailEntry.Text))
            {
                ShowErrorMessage(EmailErrorLabel, "Please enter a valid email address.");
                hasError = true;
            }

            if (string.IsNullOrWhiteSpace(PhoneNumberEntry.Text) || !IsValidPhoneNumber(PhoneNumberEntry.Text))
            {
                ShowErrorMessage(PhoneNumberErrorLabel, "Phone number must be 11 digits.");
                hasError = true;
            }

            if (string.IsNullOrWhiteSpace(PasswordEntry.Text) || PasswordEntry.Text.Length < 6)
            {
                ShowErrorMessage(PasswordErrorLabel, "Password must be at least 6 characters.");
                hasError = true;
            }

            if (PasswordEntry.Text != ConfirmPasswordEntry.Text)
            {
                ShowErrorMessage(ConfirmPasswordErrorLabel, "Passwords do not match.");
                hasError = true;
            }

            if (string.IsNullOrWhiteSpace(DocumentImageBase64) || string.IsNullOrWhiteSpace(FaceImageBase64))
            {
                // Display error messages for images if required (add respective labels in the XAML if needed)
                hasError = true;
            }

            if (!AgreeTermsCheckBox.IsChecked)
            {
                await DisplayAlert("Terms Required", "You must agree to the Terms and Conditions to proceed.", "OK");
                hasError = true;
            }

            if (hasError) return;

            // Proceed with registration if no errors
            try
            {
                var user = new UserItem
                {
                    Name = NameEntry.Text,
                    Email = EmailEntry.Text,
                    PasswordHash = HashPassword(PasswordEntry.Text),
                    PhoneNumber = PhoneNumberEntry.Text,
                    DocumentImageBase64 = DocumentImageBase64,
                    FaceImageBase64 = FaceImageBase64
                };

                var result = await App.AuthApi.Register(user);
                await DisplayAlert("Success", "Registration successful!", "OK");
                await Navigation.PushAsync(new LoginPage());
            }
            catch (ApiException ex)
            {
                await DisplayAlert("Registration Failed", $"Error: {ex.Content}", "OK");
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"An unexpected error occurred: {ex.Message}", "OK");
            }
        }

        private void ClearErrorMessages()
        {
            NameErrorLabel.IsVisible = false;
            EmailErrorLabel.IsVisible = false;
            PhoneNumberErrorLabel.IsVisible = false;
            PasswordErrorLabel.IsVisible = false;
            ConfirmPasswordErrorLabel.IsVisible = false;
        }

        private void ShowErrorMessage(Label label, string message)
        {
            label.Text = message;
            label.IsVisible = true;
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

        private async void OnTermsClicked(object sender, EventArgs e)
        {
            await Navigation.PushAsync(new TermsPage());
        }

        private async void OnLoginClicked(object sender, EventArgs e)
        {
            await Navigation.PushAsync(new LoginPage());
        }
    }
}