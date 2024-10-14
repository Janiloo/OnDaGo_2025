using System;
using OnDaGO.MAUI.Services;

namespace OnDaGO.MAUI.Views
{
    public partial class NewPasswordPage : ContentPage
    {
        private readonly string _email;
        private readonly string _token;

        public NewPasswordPage(string email, string token)
        {
            InitializeComponent();
            _email = email;
            _token = token;
        }

        private async void OnSubmitClicked(object sender, EventArgs e)
        {
            string newPassword = NewPasswordEntry.Text;
            string confirmPassword = ConfirmPasswordEntry.Text;

            if (string.IsNullOrWhiteSpace(newPassword) || string.IsNullOrWhiteSpace(confirmPassword))
            {
                await DisplayAlert("Error", "Please fill in all fields.", "OK");
                return;
            }

            if (newPassword != confirmPassword)
            {
                await DisplayAlert("Error", "Passwords do not match.", "OK");
                return;
            }

            // Here you would call your password reset service to update the password
            bool isPasswordUpdated = true; // Replace this with actual service call

            if (isPasswordUpdated)
            {
                await DisplayAlert("Success", "Password has been reset successfully.", "OK");
                // Optionally navigate to another page, like the login page
                await Navigation.PopToRootAsync();
            }
            else
            {
                await DisplayAlert("Error", "Failed to reset password. Please try again.", "OK");
            }
        }
    }
}
