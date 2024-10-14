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

        // Back button event handler
        private async void OnBackButtonClicked(object sender, EventArgs e)
        {
            await Navigation.PopAsync(); // Navigate back to the previous page
        }

        private async void OnForgotPasswordClicked(object sender, EventArgs e)
        {
            string email = EmailEntry.Text;
            ErrorLabel.IsVisible = false; // Hide error label initially
            ErrorLabel.Text = string.Empty; // Clear previous error message

            if (string.IsNullOrWhiteSpace(email))
            {
                ErrorLabel.Text = "Please enter your email.";
                ErrorLabel.IsVisible = true; // Show error message
                return;
            }

            try
            {
                var request = new ForgotPasswordRequest { Email = email };
                var response = await App.AuthApi.ForgotPassword(request);

                if (response.IsSuccessStatusCode)
                {
                    // Hide error label if success
                    ErrorLabel.IsVisible = false;
                    // Pass the email to the ResetTokenPage
                    await Navigation.PushAsync(new ResetTokenPage(email)); // Pass email as a parameter
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    ErrorLabel.Text = "Email does not exist. Please check your email and try again.";
                    ErrorLabel.IsVisible = true; // Show error message
                }
                else
                {
                    ErrorLabel.Text = "Failed to send reset token. Please try again later.";
                    ErrorLabel.IsVisible = true; // Show error message
                }
            }
            catch (ApiException ex)
            {
                ErrorLabel.Text = $"Failed to send reset token: {ex.Message}";
                ErrorLabel.IsVisible = true; // Show error message
            }
            catch (Exception ex)
            {
                ErrorLabel.Text = $"An unexpected error occurred: {ex.Message}";
                ErrorLabel.IsVisible = true; // Show error message
            }
        }
    }
}
