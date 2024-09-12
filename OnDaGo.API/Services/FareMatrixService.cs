using MongoDB.Bson;
using MongoDB.Driver;
using OnDaGo.API.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace OnDaGo.API.Services
{
    public class FareMatrixService
    {
        private readonly IMongoCollection<FareMatrixItem> _fareMatrix;

        public FareMatrixService(IMongoDatabase database)
        {
            _fareMatrix = database.GetCollection<FareMatrixItem>("fareMatrix");
        }

        public async Task<List<FareMatrixItem>> GetFareMatrixAsync()
        {
            return await _fareMatrix.Find(fare => true).ToListAsync();
        }

        public async Task<FareMatrixItem> GetFareByIdAsync(string id)
        {
            return await _fareMatrix.Find(fare => fare.Id == new ObjectId(id)).FirstOrDefaultAsync();
        }

        public async Task CreateFareAsync(FareMatrixItem fare)
        {
            await _fareMatrix.InsertOneAsync(fare);
        }

        public async Task UpdateFareAsync(string id, FareMatrixItem updatedFare)
        {
            await _fareMatrix.ReplaceOneAsync(fare => fare.Id == new ObjectId(id), updatedFare);
        }

        

        

        public async Task DeleteFareAsync(string id)
        {
            await _fareMatrix.DeleteOneAsync(fare => fare.Id == new ObjectId(id));
        }

        public async Task PatchFareAsync(string id, FareMatrixItem updateModel)
        {
            var updateDefinition = Builders<FareMatrixItem>.Update
                .Set(fare => fare.Fare, updateModel.Fare)
                .Set(fare => fare.DiscountedFare, updateModel.DiscountedFare);

            await _fareMatrix.UpdateOneAsync(fare => fare.Id == new ObjectId(id), updateDefinition);
        }
    }
}
