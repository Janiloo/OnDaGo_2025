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

        /*public VehicleService()
        {
            string baseUrl = DeviceInfo.Platform == DevicePlatform.Android
                ? "http://10.0.2.2:5147"
                : "https://localhost:7140";

            _api = RestService.For<IVehicleApi>(baseUrl);
        }*/

        public VehicleService()
        {
            // Set the base URL to your Azure backend URL
            #if DEBUG
                        string baseUrl = DeviceInfo.Platform == DevicePlatform.Android
                            ? "http://10.0.2.2:5147"  // Android emulator to your local machine
                            : "http://localhost:5147"; // Running on Windows/Mac
#else
                    
                    string baseUrl = "https://ondago-api-akfye0eahsamhrgt.southeastasia-01.azurewebsites.net";
#endif
            //string baseUrl = "https://ondago-fbb0b6f0a7ede3cx.eastasia-01.azurewebsites.net";
            //string baseUrl = "https://ondago-fbb0b6f0a7ede3cx.eastasia-01.azurewebsites.net";
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

        // New method to get vehicle details
        public async Task<VehicleModel> GetVehicleDetailsAsync(string vehicleId)
        {
            try
            {
                var vehicleDetails = await _api.GetVehicleDetailsAsync(vehicleId); // Call the API method
                return vehicleDetails;
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

        public async Task UpdatePassengerCountAsync(string vehicleId, int passengerCount)
        {
            try
            {
                await _api.UpdatePassengerCountAsync(vehicleId, passengerCount);
            }
            catch (ApiException apiEx)
            {
                Console.WriteLine($"API Error: {apiEx.StatusCode} - {apiEx.Content}");
                throw;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"General Error: {ex.Message}");
                throw;
            }
        }

        public async Task UpdateVehicleStatusAsync(string plateNumber, VehicleStatusUpdateRequest request)
        {
            try
            {
                await _api.UpdateVehicleStatusAsync(plateNumber, request);
            }
            catch (ApiException apiEx)
            {
                Console.WriteLine($"API Error: {apiEx.StatusCode} - {apiEx.Content}");
                throw;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"General Error: {ex.Message}");
                throw;
            }
        }


    }

}
