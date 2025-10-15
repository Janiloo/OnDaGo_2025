using OnDaGO.MAUI.Models;
using Refit;
using System;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace OnDaGO.MAUI.Views
{
    public partial class CreatePUVPage : ContentPage
    {
        private bool isLoading;
        public bool IsLoading
        {
            get => isLoading;
            set
            {
                isLoading = value;
                LoadingIndicator.IsRunning = isLoading;
                LoadingIndicator.IsVisible = isLoading;
            }
        }

        public CreatePUVPage()
        {
            InitializeComponent();
        }

        private async void OnCreatePUVClicked(object sender, EventArgs e)
        {
            ClearErrorMessages();
            IsLoading = true;

            bool hasError = false;

            // ✅ Validation
            if (string.IsNullOrWhiteSpace(UsernameEntry.Text))
            {
                ShowErrorMessage(UsernameErrorLabel, "Username is required.");
                hasError = true;
            }

            if (string.IsNullOrWhiteSpace(EmailEntry.Text) || !IsValidEmail(EmailEntry.Text))
            {
                ShowErrorMessage(EmailErrorLabel, "Please enter a valid email address.");
                hasError = true;
            }

            if (string.IsNullOrWhiteSpace(PlateNumberEntry.Text))
            {
                ShowErrorMessage(PlateNumberErrorLabel, "Plate number is required.");
                hasError = true;
            }

            if (string.IsNullOrWhiteSpace(PasswordEntry.Text) || PasswordEntry.Text.Length < 6)
            {
                ShowErrorMessage(PasswordErrorLabel, "Password must be at least 6 characters.");
                hasError = true;
            }

            if (hasError)
            {
                IsLoading = false;
                return;
            }

            var driverRequest = new DriverRegistrationRequest
            {
                Username = UsernameEntry.Text.Trim(),
                Email = EmailEntry.Text.Trim(),
                Password = PasswordEntry.Text,
                PlateNumber = PlateNumberEntry.Text.Trim(),
                Role = "Driver"
            };

            try
            {
                var result = await App.AuthApi.RegisterDriver(driverRequest);
                await DisplayAlert("Success", "Driver account created successfully!", "OK");
                await Navigation.PushAsync(new AdminSettingsPage());
            }
            catch (ApiException ex)
            {
                string errorMessage = ex.StatusCode switch
                {
                    System.Net.HttpStatusCode.BadRequest => "Invalid input. Please check your entries.",
                    System.Net.HttpStatusCode.Conflict => "This username, email, or plate number is already in use.",
                    _ => $"Server error ({ex.StatusCode}). Please try again later."
                };

                await DisplayAlert("Error", errorMessage, "OK");
                Console.WriteLine($"API Error: {ex.Content}");
            }
            catch (HttpRequestException)
            {
                await DisplayAlert("Network Error", "Please check your internet connection and try again.", "OK");
            }
            catch (TaskCanceledException)
            {
                await DisplayAlert("Timeout", "The request took too long. Please try again.", "OK");
            }
            catch (Exception ex)
            {
                await DisplayAlert("Unexpected Error", "Something went wrong. Please try again later.", "OK");
                Console.WriteLine($"Unexpected error: {ex}");
            }
            finally
            {
                IsLoading = false;
            }
        }

        private void OnShowPasswordCheckedChanged(object sender, CheckedChangedEventArgs e)
        {
            PasswordEntry.IsPassword = !e.Value;
        }

        private void ClearErrorMessages()
        {
            UsernameErrorLabel.IsVisible = false;
            EmailErrorLabel.IsVisible = false;
            PlateNumberErrorLabel.IsVisible = false;
            PasswordErrorLabel.IsVisible = false;
        }

        private void ShowErrorMessage(Label label, string message)
        {
            label.Text = message;
            label.IsVisible = true;
        }

        private bool IsValidEmail(string email) =>
            !string.IsNullOrWhiteSpace(email) &&
            new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$").IsMatch(email);

        private async void OnBackClicked(object sender, EventArgs e)
        {
            await Navigation.PopAsync();
        }
    }
}
