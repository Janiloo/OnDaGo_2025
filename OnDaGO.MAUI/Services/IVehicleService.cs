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

    }
}
