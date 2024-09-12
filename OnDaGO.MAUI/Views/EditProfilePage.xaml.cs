using Microsoft.Maui.Controls;
using OnDaGO.MAUI.Models;
using OnDaGO.MAUI.Services;
using Refit;
using System;

namespace OnDaGO.MAUI.Views
{
    public partial class EditProfilePage : ContentPage
    {
        public EditProfilePage()
        {
            InitializeComponent();
            LoadUserProfile();
        }

        private async void LoadUserProfile()
        {
            try
            {
                var client = HttpClientFactory.CreateClient();
                var authApi = RestService.For<IAuthApi>(client);
                var response = await authApi.GetUserProfile();

                if (response != null)
                {
                    NameEntry.Text = response.Name;
                    PhoneNumberEntry.Text = response.PhoneNumber;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading user profile: {ex.Message}");
            }
        }

        private async void OnSaveClicked(object sender, EventArgs e)
        {
            var updatedProfile = new UpdateProfileRequest
            {
                Name = NameEntry.Text,
                PhoneNumber = PhoneNumberEntry.Text
            };

            try
            {
                var client = HttpClientFactory.CreateClient();
                var authApi = RestService.For<IAuthApi>(client);
                var response = await authApi.EditProfile(updatedProfile);

                if (response != null)
                {
                    await DisplayAlert("Success", "Profile updated successfully.", "OK");
                    await Navigation.PopAsync(); // Go back to ProfilePage
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating profile: {ex.Message}");
                await DisplayAlert("Error", "Failed to update profile.", "OK");
            }
        }
    }
}
