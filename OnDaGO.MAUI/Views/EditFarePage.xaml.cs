using OnDaGO.MAUI.Models;
using OnDaGO.MAUI.Services;
using System;
using System.Collections.Generic;
using MongoDB.Bson;
using Microsoft.Maui.Controls;

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
                FareMatrixCollection.ItemsSource = fareMatrixList; // Binding data to CollectionView
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
                        // Ensure the ID is valid and not null/empty
                        if (fareMatrixItem.Origin != null && fareMatrixItem.Destination != null) // Check for required fields
                        {
                            // Create an update model without the Id field for the PATCH body
                            var updateModel = new
                            {
                                Origin = fareMatrixItem.Origin,
                                Destination = fareMatrixItem.Destination,
                                Fare = fareMatrixItem.Fare,
                                DiscountedFare = fareMatrixItem.DiscountedFare
                            };

                            // Update each fare matrix item through the service
                            // Assuming that PatchFareAsync takes only the ID and the update model as an anonymous object
                            await _fareMatrixService.PatchFareAsync(fareMatrixItem.Id.ToString(), updateModel);
                        }
                        else
                        {
                            await DisplayAlert("Error", "Origin and Destination cannot be null.", "OK");
                        }
                    }

                    // Optionally display a success message
                    await DisplayAlert("Success", "Fare matrix updated successfully.", "OK");
                }
                else
                {
                    await DisplayAlert("Error", "Failed to retrieve fare matrix data.", "OK");
                }
            }
            catch (Exception ex)
            {
                await DisplayAlert("Error", $"An error occurred while saving changes: {ex.Message}", "OK");
            }
        }


    }
}
