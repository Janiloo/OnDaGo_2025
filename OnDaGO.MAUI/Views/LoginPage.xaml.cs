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
            // Show the loading animation and disable the login button
            LoginActivityIndicator.IsVisible = true;
            LoginActivityIndicator.IsRunning = true;
            LoginButton.IsEnabled = false;

            try
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

                // Perform login API call
                var result = await App.AuthApi.Login(user);

                if (result != null)
                {
                    await SecureStorage.SetAsync("jwt_token", result.Token);
                    await SecureStorage.SetAsync("user_id", result.User.Id);

                    var locationPermissionStatus = await Permissions.CheckStatusAsync<Permissions.LocationWhenInUse>();
                    if (locationPermissionStatus != PermissionStatus.Granted)
                    {
                        locationPermissionStatus = await Permissions.RequestAsync<Permissions.LocationWhenInUse>();
                    }

                    if (locationPermissionStatus != PermissionStatus.Granted)
                    {
                        await DisplayAlert("Location Permission", "Location permission is required to access location features.", "OK");
                        return;
                    }

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
                Console.WriteLine($"API Error: {ex.StatusCode} - {ex.Message} - Content: {ex.Content}");
                ErrorLabel.Text = $"Login failed: {ex.Message}";
                ErrorLabel.IsVisible = true;

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
                Console.WriteLine($"Unexpected Error: {ex.Message}");
                ErrorLabel.Text = $"An unexpected error occurred: {ex.Message}";
                ErrorLabel.IsVisible = true;
            }
            finally
            {
                // Hide the loading animation and re-enable the login button
                LoginActivityIndicator.IsVisible = false;
                LoginActivityIndicator.IsRunning = false;
                LoginButton.IsEnabled = true;
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