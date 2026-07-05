using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;
using OnDaGo.API.Controllers;
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

        public async Task<VehicleModel> GetVehicleByPuvAsync(string puvNo)
        {
            return await _vehicles.Find(vehicle => vehicle.PuvNo == puvNo).FirstOrDefaultAsync();
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

        public async Task UpdateVehicleStatusAsync(string puvNo, VehicleStatusUpdateRequest request)
        {
            var update = Builders<VehicleModel>.Update
                .Set(v => v.PassengerCount, request.PassengerCount)
                .Set(v => v.CurrentLat, request.Latitude)
                .Set(v => v.CurrentLong, request.Longitude)
                .Set(v => v.LastUpdated, DateTime.UtcNow)
                // GeoJSON mirror keeps the 2dsphere index usable for $near queries.
                .Set(v => v.Location, new GeoJsonPoint<GeoJson2DGeographicCoordinates>(
                    new GeoJson2DGeographicCoordinates(request.Longitude, request.Latitude)));

            await _vehicles.UpdateOneAsync(v => v.PuvNo == puvNo, update);
        }

        /// <summary>
        /// Marks a vehicle offline by clearing its last-broadcast timestamp, so it
        /// reads as stale in GET responses (not just via the real-time event).
        /// </summary>
        public async Task SetVehicleOfflineAsync(string puvNo)
        {
            var update = Builders<VehicleModel>.Update.Set(v => v.LastUpdated, (DateTime?)null);
            await _vehicles.UpdateOneAsync(v => v.PuvNo == puvNo, update);
        }

        /// <summary>
        /// Vehicles within <paramref name="radiusMeters"/> of a point, served by the
        /// 2dsphere index (no collection scan). The scalable query path for clients
        /// that only care about nearby PUVs.
        /// </summary>
        public async Task<List<VehicleModel>> GetVehiclesNearAsync(double latitude, double longitude, double radiusMeters)
        {
            var point = new GeoJsonPoint<GeoJson2DGeographicCoordinates>(
                new GeoJson2DGeographicCoordinates(longitude, latitude));
            var filter = Builders<VehicleModel>.Filter.NearSphere(v => v.Location, point, maxDistance: radiusMeters);
            return await _vehicles.Find(filter).ToListAsync();
        }

        /// <summary>
        /// Creates the vehicle indexes (idempotent): unique plate number and a
        /// 2dsphere index over the GeoJSON location. Called once at startup.
        /// </summary>
        public static async Task EnsureIndexesAsync(IMongoDatabase db)
        {
            var vehicles = db.GetCollection<VehicleModel>("coll_vehicles");

            var puvNoIndex = new CreateIndexModel<VehicleModel>(
                Builders<VehicleModel>.IndexKeys.Ascending(v => v.PuvNo),
                new CreateIndexOptions { Unique = true, Name = "ux_puv_no" });

            var geoIndex = new CreateIndexModel<VehicleModel>(
                Builders<VehicleModel>.IndexKeys.Geo2DSphere(v => v.Location),
                new CreateIndexOptions { Name = "gx_location" });

            await vehicles.Indexes.CreateManyAsync(new[] { puvNoIndex, geoIndex });
        }


    }
}
