using Microsoft.Maui.Controls;
using OnDaGO.MAUI.Models;
using OnDaGO.MAUI.Services;
using Refit;
using System;
using System.Threading.Tasks;

namespace OnDaGO.MAUI.Views;

public partial class ProfilePage : ContentPage
{
    public ProfilePage()
    {
        InitializeComponent();
        GetUserProfile();
    }

    private async void GetUserProfile()
    {
        try
        {
            var token = await SecureStorage.GetAsync("jwt_token");

            if (!string.IsNullOrEmpty(token))
            {
                var client = HttpClientFactory.CreateClient();
                var authApi = RestService.For<IAuthApi>(client);
                var response = await authApi.GetUserProfile();

                if (response != null)
                {
                    NameLabel.Text = $"{response.Name}";
                    EmailLabel.Text = $"Email: {response.Email}";
                    PhoneNumberLabel.Text = $"PhoneNumber: {response.PhoneNumber}";
                }
            }
        }
        catch (Exception ex)
        {
            // Handle or log the exception
            Console.WriteLine($"Error fetching user profile: {ex.Message}");
        }
    }

    private async void OnLogoutClicked(object sender, EventArgs e)
    {
        try
        {
            var response = await App.AuthApi.Logout();

            if (response.IsSuccessStatusCode)
            {
                // Clear the JWT token from SecureStorage
                SecureStorage.Remove("jwt_token");

                await DisplayAlert("Logged Out", "You have been logged out successfully.", "OK");
                Application.Current.MainPage = new NavigationPage(new LoginPage());
            }
            else
            {
                await DisplayAlert("Error", "Logout failed. Please try again.", "OK");
            }
        }
        catch (Exception ex)
        {
            await DisplayAlert("Error", $"An unexpected error occurred: {ex.Message}", "OK");
        }
    }


    private async void OnEditProfileClicked(object sender, EventArgs e)
    {
        await Navigation.PushAsync(new EditProfilePage());
    }
}
