using OnDaGO.MAUI.Models;
using Refit;
using System;
using OnDaGO.MAUI.Views;

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
            var user = new UserItem
            {
                Name = NameEntry.Text,
                Email = EmailEntry.Text,
                PasswordHash = HashPassword(PasswordEntry.Text), // Hash password before sending
                PhoneNumber = PhoneNumberEntry.Text // Include Phone Number
            };

            try
            {
                var result = await App.AuthApi.Register(user);
                await DisplayAlert("Success", "Registration successful!", "OK");
                await Navigation.PushAsync(new LoginPage());
            }
            catch (ApiException ex)
            {
                await DisplayAlert("Error", $"Registration failed: {ex.Content}", "OK");
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"An unexpected error occurred: {ex.Message}", "OK");
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
    }
}
