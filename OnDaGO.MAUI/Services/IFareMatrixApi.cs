using Refit;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using OnDaGO.MAUI.Models;

namespace OnDaGO.MAUI.Services
{
    public interface IFareMatrixApi
    {
        [Get("/api/FareMatrix/{id}")]
        Task<FareMatrixItem> GetFareByIdAsync(string id); // Add this in the API interface

        [Get("/api/FareMatrix")]
        Task<List<FareMatrixItem>> GetFareMatrixAsync();

        [Put("/api/FareMatrix/{id}")]
        Task UpdateFareAsync(string id, [Body] FareMatrixItem updatedFare);

        [Patch("/api/FareMatrix/{id}")]
        Task PatchFareAsync(string id, [Body] FareMatrixItem updateModel);
    }

    public class FareMatrixService
    {
        private readonly IFareMatrixApi _api;

        public FareMatrixService()
        {
            string baseUrl = DeviceInfo.Platform == DevicePlatform.Android
                ? "http://10.0.2.2:5147"
                : "https://localhost:7140";

            _api = RestService.For<IFareMatrixApi>(baseUrl);
        }

        public async Task<FareMatrixItem> GetFareByIdAsync(string id) // Implement the missing method
        {
            return await _api.GetFareByIdAsync(id);
        }

        public async Task<List<FareMatrixItem>> GetFareMatrixAsync()
        {
            return await _api.GetFareMatrixAsync();
        }

        public async Task UpdateFareAsync(string id, FareMatrixItem updatedFare)
    {
        await _api.UpdateFareAsync(id, updatedFare);
    }
        public async Task PatchFareAsync(string id, FareMatrixItem updateModel)
        {
            await _api.PatchFareAsync(id, updateModel);
        }

    }
}
