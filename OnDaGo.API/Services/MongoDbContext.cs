using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using OnDaGo.API.Models;

namespace OnDaGo.API.Services
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(IConfiguration configuration)
        {
            var client = new MongoClient(configuration.GetConnectionString("MongoDb"));
            _database = client.GetDatabase("db_ondago"); // Connect to db_ondago
        }

        public IMongoCollection<VehicleService> Vehicles => _database.GetCollection<VehicleService>("db_vehicles");
    }
}
