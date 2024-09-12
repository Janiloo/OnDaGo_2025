using OnDaGO.MAUI.Models;
using Refit;
using System;
using OnDaGO.MAUI.Services;

namespace OnDaGO.MAUI.Views
{
    public partial class ResetPasswordPage : ContentPage
    {
        public ResetPasswordPage()
        {
            InitializeComponent();
        }

        private async void OnForgotPasswordClicked(object sender, EventArgs e)
        {
            string email = EmailEntry.Text;
            if (string.IsNullOrWhiteSpace(email))
            {
                await DisplayAlert("Error", "Please enter your email.", "OK");
                return;
            }

            try
            {
                var request = new ForgotPasswordRequest { Email = email };
                var response = await App.AuthApi.ForgotPassword(request);
                if (response.IsSuccessStatusCode)
                {
                    await DisplayAlert("Success", "Reset token sent to your email.", "OK");
                    await Navigation.PushAsync(new ResetTokenPage());
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
        }

    }
}