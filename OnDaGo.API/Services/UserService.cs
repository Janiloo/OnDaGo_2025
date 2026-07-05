using MongoDB.Bson;
using MongoDB.Driver;
using OnDaGo.API.Models;
using System;
using System.Threading.Tasks;

namespace OnDaGo.API.Services
{
    public class UserService
    {
        private readonly IMongoCollection<UserItem> _users;
        public readonly IMongoDatabase _database; // Expose the database

        public UserService(IMongoDatabase database)
        {
            _database = database; // Save reference to database
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

        public async Task<bool> UpdateResetTokenAsync(string email, string tokenHash, DateTime expiry)
        {
            var update = Builders<UserItem>.Update
                .Set(u => u.ResetToken, tokenHash)
                .Set(u => u.ResetTokenExpiry, expiry)
                .Set(u => u.ResetTokenAttempts, 0);

            var result = await _users.UpdateOneAsync(
                user => user.Email == email,
                update);

            return result.ModifiedCount > 0;
        }

        /// <summary>Atomically counts a failed reset attempt; returns the new attempt total.</summary>
        public async Task<int> IncrementResetTokenAttemptsAsync(string email)
        {
            var updated = await _users.FindOneAndUpdateAsync(
                Builders<UserItem>.Filter.Eq(u => u.Email, email),
                Builders<UserItem>.Update.Inc(u => u.ResetTokenAttempts, 1),
                new FindOneAndUpdateOptions<UserItem> { ReturnDocument = ReturnDocument.After });

            return updated?.ResetTokenAttempts ?? int.MaxValue;
        }

        /// <summary>Invalidates any outstanding reset token (used on success and on lockout).</summary>
        public async Task ClearResetTokenAsync(string email)
        {
            var update = Builders<UserItem>.Update
                .Set(u => u.ResetToken, (string?)null)
                .Set(u => u.ResetTokenExpiry, (DateTime?)null)
                .Set(u => u.ResetTokenAttempts, 0);

            await _users.UpdateOneAsync(user => user.Email == email, update);
        }

        public async Task<UserItem> FindByIdAsync(string id)
        {
            return await _users.Find(u => u.Id == new ObjectId(id)).FirstOrDefaultAsync();
        }

        public async Task DeleteUserAsync(string id)
        {
            await _users.DeleteOneAsync(user => user.Id == new ObjectId(id));
        }

        public async Task<UserItem> FindByUsernameAsync(string username)
        {
            return await _users.Find(u => u.Name == username).FirstOrDefaultAsync();
        }
    }
}
