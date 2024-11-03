using OnDaGO.MAUI.Models;
using Refit;
using System;

namespace OnDaGO.MAUI.Views
{
    public partial class CreateAdminPage : ContentPage
    {
        public CreateAdminPage()
        {
            InitializeComponent();
        }

        private async void OnCreateAdminClicked(object sender, EventArgs e)
        {
            var adminUser = new UserItem
            {
                Name = NameEntry.Text,
                Email = EmailEntry.Text,
                PasswordHash = HashPassword(PasswordEntry.Text), // Hash the password before sending
                PhoneNumber = PhoneNumberEntry.Text,
                Role = "Admin" // Explicitly set the role to Admin
            };

            try
            {
                var result = await App.AuthApi.RegisterAdmin(adminUser);
                await DisplayAlert("Success", "Admin account created successfully!", "OK");
                await Navigation.PushAsync(new AdminSettingsPage());
            }
            catch (ApiException ex)
            {
                await DisplayAlert("Error", $"Admin creation failed: {ex.StatusCode} - {ex.Content}", "OK");
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"An unexpected error occurred: {ex.Message}", "OK");
            }
        }

        private async void OnBackClicked(object sender, EventArgs e)
        {
            await Navigation.PopAsync(); // Go back to the previous page (AdminSettingsPage)
        }

        private void OnShowPasswordCheckedChanged(object sender, CheckedChangedEventArgs e)
        {
            // Toggle password visibility based on the CheckBox state
            PasswordEntry.IsPassword = !e.Value;
        }

        private string HashPassword(string password)
        {
            // Replace this with actual password hashing logic
            return password;
        }
    }
}
