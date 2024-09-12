using OnDaGO.MAUI.Models;
using System;
using System.Net.Http;
using OnDaGO.MAUI.Services;

namespace OnDaGO.MAUI.Views
{
    public partial class ResetTokenPage : ContentPage
    {
        public ResetTokenPage()
        {
            InitializeComponent();
        }

        private async void OnResetPasswordClicked(object sender, EventArgs e)
        {
            string email = EmailEntry.Text;
            string token = TokenEntry.Text;
            string newPassword = NewPasswordEntry.Text;

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(newPassword))
            {
                await DisplayAlert("Error", "Please fill in all fields.", "OK");
                return;
            }

            var request = new ChangePasswordRequest { Email = email, Token = token, NewPassword = newPassword };

            try
            {
                var response = await App.AuthApi.ChangePassword(request);
                if (response.IsSuccessStatusCode)
                {
                    await DisplayAlert("Success", "Your password has been reset successfully.", "OK");
                    // Navigate to the login page or another page
                    await Navigation.PushAsync(new LoginPage()); // Navigate to the login page after success
                }
                else
                {
                    await DisplayAlert("Error", "Failed to reset password. Please try again.", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"An unexpected error occurred: {ex.Message}", "OK");
            }
        }
    }
}
