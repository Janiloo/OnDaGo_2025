using Microsoft.Maui.Controls;
using OnDaGO.MAUI.Models;
using OnDaGO.MAUI.Services;
using Refit;
using System;
using System.Threading.Tasks;


namespace OnDaGO.MAUI.Views;

public partial class AdminProfilePage : ContentPage
{
	public AdminProfilePage()
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
                    NameLabel.Text = $"Name: {response.Name}";
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

    private async void OnEditProfileClicked(object sender, EventArgs e)
    {
        await Navigation.PushAsync(new EditProfilePage());
    }
}