using MongoDB.Bson;
using MongoDB.Driver;
using OnDaGo.API.Models;
using System;
using System.Collections.Generic;
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

        // ----- Multi-tenancy (Phase 1) -----

        /// <summary>True once at least one platform super admin exists (guards bootstrap).</summary>
        public Task<bool> AnyPlatformAdminAsync() =>
            _users.Find(u => u.IsPlatformAdmin).AnyAsync();

        /// <summary>Grant an existing account platform-admin capability and set its company.</summary>
        public async Task<bool> PromotePlatformAdminAsync(string email, string companyId)
        {
            var update = Builders<UserItem>.Update
                .Set(u => u.IsPlatformAdmin, true)
                .Set(u => u.CompanyId, companyId)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);
            var result = await _users.UpdateOneAsync(u => u.Email == email, update);
            return result.ModifiedCount > 0;
        }

        // ----- Company-admin lifecycle (web console) -----

        public static string HashPassword(string password) => BCrypt.Net.BCrypt.HashPassword(password);

        public static bool VerifyPassword(string hash, string password) => BCrypt.Net.BCrypt.Verify(password, hash);

        /// <summary>All company-admin accounts (Role == "Admin"), across companies.</summary>
        public Task<List<UserItem>> GetAdminsAsync() =>
            _users.Find(u => u.Role == "Admin").ToListAsync();

        /// <summary>Puts an account on a fresh temporary password (SuperAdmin reset).</summary>
        public async Task<bool> SetTemporaryPasswordAsync(string email, string passwordHash)
        {
            var update = Builders<UserItem>.Update
                .Set(u => u.PasswordHash, passwordHash)
                .Set(u => u.MustChangePassword, true)
                .Set(u => u.ResetToken, (string?)null)
                .Set(u => u.ResetTokenExpiry, (DateTime?)null)
                .Set(u => u.ResetTokenAttempts, 0)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);
            var result = await _users.UpdateOneAsync(u => u.Email == email, update);
            return result.ModifiedCount > 0;
        }

        // ----- Driver management (web console, Tier 1) -----

        /// <summary>
        /// A company's drivers. <paramref name="includeUnstamped"/> mirrors the
        /// single-company transition of TenantCollection: legacy drivers whose
        /// CompanyId was never stamped stay visible to the sole company.
        /// A null <paramref name="companyId"/> (pre-bootstrap) returns all drivers.
        /// </summary>
        public Task<List<UserItem>> GetDriversAsync(string? companyId, bool includeUnstamped)
        {
            var role = Builders<UserItem>.Filter.Eq(u => u.Role, "Driver");
            if (companyId == null) return _users.Find(role).ToListAsync();

            var company = Builders<UserItem>.Filter.Eq(u => u.CompanyId, companyId);
            if (includeUnstamped)
                company = Builders<UserItem>.Filter.Or(
                    company, Builders<UserItem>.Filter.Eq(u => u.CompanyId, (string?)null));
            return _users.Find(Builders<UserItem>.Filter.And(role, company)).ToListAsync();
        }

        /// <summary>The driver currently holding a plate/PUV number, if any.
        /// Plates are globally unique (ux_puv_no), so this needs no company scope.</summary>
        public Task<UserItem?> FindDriverByPlateAsync(string plateNumber) =>
            _users.Find(u => u.Role == "Driver" && u.PlateNumber == plateNumber)
                .FirstOrDefaultAsync()!;

        /// <summary>Enable/disable an account ("Active" | "Disabled").</summary>
        public async Task SetUserStatusAsync(ObjectId id, string status)
        {
            var update = Builders<UserItem>.Update
                .Set(u => u.Status, status)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);
            await _users.UpdateOneAsync(u => u.Id == id, update);
        }

        /// <summary>Points a driver at a vehicle (or clears the assignment).</summary>
        public async Task SetPlateNumberAsync(ObjectId id, string? plateNumber)
        {
            var update = Builders<UserItem>.Update
                .Set(u => u.PlateNumber, plateNumber)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);
            await _users.UpdateOneAsync(u => u.Id == id, update);
        }

        /// <summary>Admin edit of a driver's profile fields.</summary>
        public async Task UpdateDriverProfileAsync(ObjectId id, string name, string phoneNumber)
        {
            var update = Builders<UserItem>.Update
                .Set(u => u.Name, name)
                .Set(u => u.PhoneNumber, phoneNumber)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);
            await _users.UpdateOneAsync(u => u.Id == id, update);
        }

        /// <summary>Sets a permanent password and clears the must-change gate.</summary>
        public async Task SetPasswordAndClearMustChangeAsync(string email, string passwordHash)
        {
            var update = Builders<UserItem>.Update
                .Set(u => u.PasswordHash, passwordHash)
                .Set(u => u.MustChangePassword, false)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);
            await _users.UpdateOneAsync(u => u.Email == email, update);
        }
    }
}
