using System;
using Microsoft.Maui.Controls;
using The49.Maui.BottomSheet;

namespace OnDaGO.MAUI.Views;

public partial class VehicleInfoBottomSheet : ContentPage
{
	public VehicleInfoBottomSheet()
	{
		InitializeComponent();
	}

    public void SetVehicleInfo(string puvNo, string otherDetails)
    {
        PuvNoLabel.Text = puvNo;
        OtherDetailsLabel.Text = otherDetails;
    }

    private void OnCloseButtonClicked(object sender, EventArgs e)
    {
        // Hide or remove the bottom sheet
        this.IsVisible = false;
    }
}