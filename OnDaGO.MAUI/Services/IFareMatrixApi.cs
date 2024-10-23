using Refit;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using OnDaGO.MAUI.Models;
using Newtonsoft.Json;

namespace OnDaGO.MAUI.Services
{
    public interface IFareMatrixApi
    {
        [Get("/api/FareMatrix/{id}")]
        Task<FareMatrixItem> GetFareByIdAsync(string id);

        [Get("/api/FareMatrix")]
        Task<List<FareMatrixItem>> GetFareMatrixAsync();

        [Put("/api/FareMatrix/{id}")]
        Task UpdateFareAsync(string id, [Body] FareMatrixItem updatedFare);

        [Patch("/api/FareMatrix/{id}")]
        Task PatchFareAsync(string id, [Body] object updateModel);
    }

    public class FareMatrixService
    {
        private readonly IFareMatrixApi _api;

        
        /*public FareMatrixService()
        {
            string baseUrl = DeviceInfo.Platform == DevicePlatform.Android
                ? "http://10.0.2.2:5147"
                : "https://localhost:7140";

            _api = RestService.For<IFareMatrixApi>(baseUrl);
        }*/

        public FareMatrixService()
        {
            // Set the base URL to your Azure backend URL
            string baseUrl = "https://ondago-fbb0b6f0a7ede3cx.eastasia-01.azurewebsites.net";

            _api = RestService.For<IFareMatrixApi>(baseUrl);
        }

        public async Task<FareMatrixItem> GetFareByIdAsync(string id)
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

        public async Task PatchFareAsync(string id, object updateModel)
        {
            await _api.PatchFareAsync(id, updateModel);
        }


    }

}
