// Services/IVehicleApi.cs
using Refit;
using System.Collections.Generic;
using System.Threading.Tasks;
using OnDaGO.MAUI.Models;

namespace OnDaGO.MAUI.Services
{
    public interface IVehicleApi
    {
        [Get("/api/vehicle")]
        Task<List<VehicleModel>> GetVehiclesAsync();

        [Get("/vehicles/{id}")] // Define the endpoint to get vehicle details
        Task<VehicleModel> GetVehicleDetailsAsync(string id);

        [Patch("/api/vehicle/{id}/passengerCount")]
        Task UpdatePassengerCountAsync(string id, [Body] int passengerCount);

        [Patch("/api/vehicle/{puvNo}/status")]
        Task UpdateVehicleStatusAsync(string puvNo, [Body] VehicleStatusUpdateRequest request);


    }
}
