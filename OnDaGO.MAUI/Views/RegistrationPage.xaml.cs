using OnDaGO.MAUI.Models;
using Refit;
using System;
using System.Text.RegularExpressions;

namespace OnDaGO.MAUI.Views
{
    public partial class RegistrationPage : ContentPage
    {
        public RegistrationPage()
        {
            InitializeComponent();
        }

        private async void OnRegisterClicked(object sender, EventArgs e)
        {
            // Clear the error message before attempting registration
            ErrorLabel.IsVisible = false;
            ErrorLabel.Text = string.Empty;

            var user = new UserItem
            {
                Name = NameEntry.Text,
                Email = EmailEntry.Text,
                PasswordHash = HashPassword(PasswordEntry.Text), // Hash password before sending
                PhoneNumber = PhoneNumberEntry.Text // Include Phone Number
            };

            // Input validation
            if (string.IsNullOrWhiteSpace(user.Name))
            {
                ShowErrorMessage("Name is required.");
                return;
            }

            if (!IsValidEmail(user.Email))
            {
                ShowErrorMessage("Invalid email address.");
                return;
            }

            if (string.IsNullOrWhiteSpace(user.PasswordHash) || user.PasswordHash.Length < 6)
            {
                ShowErrorMessage("Password must be at least 6 characters long.");
                return;
            }

            if (!PasswordsMatch(PasswordEntry.Text, ConfirmPasswordEntry.Text))
            {
                ShowErrorMessage("Passwords do not match.");
                return;
            }

            if (!IsValidPhoneNumber(user.PhoneNumber))
            {
                ShowErrorMessage("Phone number must be exactly 11 digits.");
                return;
            }

            try
            {
                var result = await App.AuthApi.Register(user);
                await DisplayAlert("Success", "Registration successful!", "OK");
                await Navigation.PushAsync(new LoginPage());
            }
            catch (ApiException ex)
            {
                ShowErrorMessage($"Registration failed: {ex.Content}");
            }
            catch (Exception ex)
            {
                ShowErrorMessage($"An unexpected error occurred: {ex.Message}");
            }
        }

        private async void OnLoginClicked(object sender, EventArgs e)
        {
            await Navigation.PushAsync(new LoginPage());
        }

        private string HashPassword(string password)
        {
            // Replace this with actual password hashing logic
            return password;
        }

        // Helper method to display error messages
        private void ShowErrorMessage(string message)
        {
            ErrorLabel.Text = message;
            ErrorLabel.IsVisible = true;
        }

        // Email validation method
        private bool IsValidEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }

        // Phone number validation (11 digits)
        private bool IsValidPhoneNumber(string phoneNumber)
        {
            return Regex.IsMatch(phoneNumber, @"^\d{11}$");
        }

        // Password matching validation
        private bool PasswordsMatch(string password, string confirmPassword)
        {
            return password == confirmPassword;
        }

        // Show/Hide Password toggle
        private void OnShowPasswordCheckedChanged(object sender, CheckedChangedEventArgs e)
        {
            PasswordEntry.IsPassword = !e.Value; // If checked, password will be shown
            ConfirmPasswordEntry.IsPassword = !e.Value; // Same for confirm password
        }
    }
}
