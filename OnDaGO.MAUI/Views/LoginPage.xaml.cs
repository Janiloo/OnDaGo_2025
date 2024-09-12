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
            var user = new UserItem
            {
                Email = EmailEntry.Text,
                PasswordHash = PasswordEntry.Text // Hash password in a real app
            };

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
                        await DisplayAlert("Success", "Admin login successful!", "OK");
                        await Navigation.PushAsync(new AdminHomePage());
                    }
                    else
                    {
                        await DisplayAlert("Success", "Login successful!", "OK");
                        await Navigation.PushAsync(new HomePage());
                    }
                }
            }
            catch (ApiException ex)
            {
                await DisplayAlert("Error", $"Login failed: {ex.Content}", "OK");
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"An unexpected error occurred: {ex.Message}", "OK");
            }
        }



        /*private async void OnForgotPasswordClicked(object sender, EventArgs e)
        {
            string email = EmailEntry.Text;
            if (string.IsNullOrWhiteSpace(email))
            {
                await DisplayAlert("Error", "Please enter your email.", "OK");
                return;
            }

            try
            {
                var response = await App.AuthApi.ForgotPassword(email);
                if (response.IsSuccessStatusCode)
                {
                    await DisplayAlert("Success", "Reset token sent to your email.", "OK");
                }
                else
                {
                    await DisplayAlert("Error", "Failed to send reset token.", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"An unexpected error occurred: {ex.Message}", "OK");
            }
        }*/

        private async void OnForgotPasswordClicked(object sender, EventArgs e)
        {
            // Navigate to ResetPasswordPage
            await Navigation.PushAsync(new ResetPasswordPage());
        }


        private async void OnRegisterClicked(object sender, EventArgs e)
        {
            await Navigation.PushAsync(new RegistrationPage());
        }
    }
}
