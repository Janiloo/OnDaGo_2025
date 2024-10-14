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

                // Store the token securely
                if (result != null)
                {
                    await SecureStorage.SetAsync("jwt_token", result.Token); // Store token securely

                    // Check if the user is an admin and navigate to AdminHomePage
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
                ErrorLabel.Text = $"Login failed: {ex.Content}";
                ErrorLabel.IsVisible = true;
            }
            catch (Exception ex)
            {
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
