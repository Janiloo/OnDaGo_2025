// Services/VehicleService.cs
using Refit;
using System.Collections.Generic;
using System.Threading.Tasks;
using OnDaGO.MAUI.Models;

namespace OnDaGO.MAUI.Services
{
    public class VehicleService
    {
        private readonly IVehicleApi _api;

        public VehicleService()
        {
            string baseUrl = DeviceInfo.Platform == DevicePlatform.Android
                ? "http://10.0.2.2:5147"
                : "https://localhost:7140";

            _api = RestService.For<IVehicleApi>(baseUrl);
        }

        public async Task<List<VehicleModel>> GetVehiclesAsync()
        {
            try
            {
                var vehicles = await _api.GetVehiclesAsync();
                return vehicles;
            }
            catch (ApiException apiEx)
            {
                Console.WriteLine($"API Error: {apiEx.StatusCode} - {apiEx.Content}");
                throw; // Rethrow to handle in the calling method
            }
            catch (Exception ex)
            {
                Console.WriteLine($"General Error: {ex.Message}");
                throw;
            }
        }


    }
}
