using MongoDB.Driver;
using OnDaGo.API.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace OnDaGo.API.Services
{
    public class VehicleService
    {
        private readonly IMongoCollection<VehicleModel> _vehicles;

        public VehicleService(IMongoDatabase db)
        {
            _vehicles = db.GetCollection<VehicleModel>("coll_vehicles");
        }

        public async Task<List<VehicleModel>> GetVehiclesAsync()
        {
            return await _vehicles.Find(vehicle => true).ToListAsync();
        }

        public async Task<VehicleModel> GetVehicleByIdAsync(string id)
        {
            return await _vehicles.Find(vehicle => vehicle.Id == id).FirstOrDefaultAsync();
        }

        public async Task CreateVehicleAsync(VehicleModel newVehicle)
        {
            await _vehicles.InsertOneAsync(newVehicle);
        }

        public async Task UpdateVehicleAsync(string id, VehicleModel updatedVehicle)
        {
            await _vehicles.ReplaceOneAsync(vehicle => vehicle.Id == id, updatedVehicle);
        }

        public async Task DeleteVehicleAsync(string id)
        {
            await _vehicles.DeleteOneAsync(vehicle => vehicle.Id == id);
        }
    }
}
