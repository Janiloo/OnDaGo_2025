using OnDaGO.MAUI.Models;
using OnDaGO.MAUI.Services;
using System;
using System.Collections.Generic;
using Microsoft.Maui.Controls;
using MongoDB.Bson;

namespace OnDaGO.MAUI.Views
{
    public partial class EditFarePage : ContentPage
    {
        private readonly FareMatrixService _fareMatrixService;

        public EditFarePage()
        {
            InitializeComponent();
            _fareMatrixService = new FareMatrixService();
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();
            await LoadFareMatrixData();
        }

        // Load fare matrix data
        private async System.Threading.Tasks.Task LoadFareMatrixData()
        {
            try
            {
                var fareMatrixList = await _fareMatrixService.GetFareMatrixAsync();
                FareMatrixCollection.ItemsSource = fareMatrixList;
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"Failed to load fare matrix data: {ex.Message}", "OK");
            }
        }

        // Save updated fare matrix data
        private async void OnSaveChangesClicked(object sender, EventArgs e)
        {
            try
            {
                var fareMatrixList = FareMatrixCollection.ItemsSource as IEnumerable<FareMatrixItem>;

                if (fareMatrixList != null)
                {
                    foreach (var fareMatrixItem in fareMatrixList)
                    {
                        await _fareMatrixService.PatchFareAsync(fareMatrixItem.Id.ToString(), fareMatrixItem);
                    }

                    await DisplayAlert("Success", "Fare matrix updated successfully.", "OK");
                }
                else
                {
                    await DisplayAlert("Error", "No fare matrix data to update.", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"Failed to save changes: {ex.Message}", "OK");
            }
        }
    }
}
