using OnDaGO.MAUI.Models;
using Refit;
using System;

namespace OnDaGO.MAUI.Views
{
    public partial class LoginPage : ContentPage
    {
        public LoginPage()
        {
            InitializeComponent();
        }

        private async void OnLoginClicked(object sender, EventArgs e)
        {
            // Clear the error message before login attempt
            ErrorLabel.IsVisible = false;
            ErrorLabel.Text = string.Empty;

            var user = new UserItem
            {
                Email = EmailEntry.Text,
                PasswordHash = PasswordEntry.Text // Hash password in a real app
            };

            // Check if fields are empty
            if (string.IsNullOrWhiteSpace(user.Email) || string.IsNullOrWhiteSpace(user.PasswordHash))
            {
                ErrorLabel.Text = "Email and Password are required.";
                ErrorLabel.IsVisible = true;
                return;
            }

            try
            {
                var result = await App.AuthApi.Login(user);

                // Store the token and user ID securely
                if (result != null)
                {
                    await SecureStorage.SetAsync("jwt_token", result.Token); // Store token securely
                    await SecureStorage.SetAsync("user_id", result.User.Id); // Store user ID securely

                    // Request location permission
                    var locationPermissionStatus = await Permissions.CheckStatusAsync<Permissions.LocationWhenInUse>();
                    if (locationPermissionStatus != PermissionStatus.Granted)
                    {
                        // If permission has not been granted, request it
                        locationPermissionStatus = await Permissions.RequestAsync<Permissions.LocationWhenInUse>();
                    }

                    // Check if location permission is granted
                    if (locationPermissionStatus != PermissionStatus.Granted)
                    {
                        // Optionally, show a message or handle accordingly
                        await DisplayAlert("Location Permission", "Location permission is required to access location features.", "OK");
                        return; // Exit or handle the denied permission scenario
                    }

                    // Proceed to the appropriate home page after permission is granted
                    if (result.User.Role == "Admin")
                    {
                        await Navigation.PushAsync(new AdminHomePage());
                    }
                    else
                    {
                        await Navigation.PushAsync(new HomePage());
                    }
                }
                else
                {
                    ErrorLabel.Text = "Invalid login credentials.";
                    ErrorLabel.IsVisible = true;
                }
            }
            catch (ApiException ex)
            {
                // Log the API error details
                Console.WriteLine($"API Error: {ex.StatusCode} - {ex.Message} - Content: {ex.Content}");
                ErrorLabel.Text = $"Login failed: {ex.Message}";
                ErrorLabel.IsVisible = true;

                // Optionally, display a user-friendly message based on the status code
                if (ex.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    ErrorLabel.Text = "Invalid login credentials. Please try again.";
                }
                else if (ex.StatusCode == System.Net.HttpStatusCode.BadRequest)
                {
                    ErrorLabel.Text = "Bad request. Please check your input.";
                }
                else
                {
                    ErrorLabel.Text = "An error occurred while logging in. Please try again later.";
                }
            }
            catch (Exception ex)
            {
                // Log unexpected errors
                Console.WriteLine($"Unexpected Error: {ex.Message}");
                ErrorLabel.Text = $"An unexpected error occurred: {ex.Message}";
                ErrorLabel.IsVisible = true;
            }
        }



        private async void OnForgotPasswordClicked(object sender, EventArgs e)
        {
            // Navigate to ResetPasswordPage
            await Navigation.PushAsync(new ResetPasswordPage());
        }

        private async void OnRegisterClicked(object sender, EventArgs e)
        {
            await Navigation.PushAsync(new RegistrationPage());
        }

        // Toggle the password visibility
        private void OnShowPasswordCheckedChanged(object sender, CheckedChangedEventArgs e)
        {
            PasswordEntry.IsPassword = !e.Value;
        }
    }
}