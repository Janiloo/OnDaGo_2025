using MongoDB.Bson;
using MongoDB.Driver;
using OnDaGo.API.Models;

namespace OnDaGo.API.Services
{
    public class UserService
    {
        private readonly IMongoCollection<UserItem> _users;

        public UserService(IMongoDatabase database)
        {
            _users = database.GetCollection<UserItem>("users");
        }

        public async Task<UserItem> FindByEmailAsync(string email)
        {
            return await _users.Find(user => user.Email == email).FirstOrDefaultAsync();
        }

        public async Task CreateUserAsync(UserItem user)
        {
            await _users.InsertOneAsync(user);
        }



        public async Task UpdateUserAsync(UserItem user)
        {
            var filter = Builders<UserItem>.Filter.Eq(u => u.Email, user.Email);
            await _users.ReplaceOneAsync(filter, user);
        }

        public async Task<bool> UpdateResetTokenAsync(string email, string token, DateTime expiry)
        {
            var update = Builders<UserItem>.Update
                .Set(u => u.ResetToken, token)
                .Set(u => u.ResetTokenExpiry, expiry);

            var result = await _users.UpdateOneAsync(
                user => user.Email == email,
                update);

            return result.ModifiedCount > 0;
        }

        public async Task<UserItem> FindByIdAsync(string id)
        {
            // Implement logic to find user by ID
            return await _users.Find(u => u.Id == new ObjectId(id)).FirstOrDefaultAsync();
        }

        public async Task DeleteUserAsync(string id)
        {
            await _users.DeleteOneAsync(user => user.Id == new ObjectId(id));
        }



    }
}