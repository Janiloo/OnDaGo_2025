﻿using Microsoft.AspNetCore.Mvc;
using OnDaGo.API.Models;
using OnDaGo.API.Services;
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Newtonsoft.Json.Linq;
using System.Security.Cryptography;
using OnDaGo.API.Tenancy;

namespace OnDaGo.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly UserService _userService;
        private readonly EmailService _emailService;
        private readonly TenantContext _tenant;
        //private readonly IdAnalyzerClient _idAnalyzerClient;
        private readonly ILogger<UsersController> _logger;
        //private readonly IdAnalyzerService _idAnalyzerService;

        public UsersController(UserService userService, EmailService emailService, TenantContext tenant)//, IdAnalyzerClient idAnalyzerClient, IdAnalyzerService idAnalyzerService)
        {
            _userService = userService;
            _emailService = emailService;
            _tenant = tenant;
            //_idAnalyzerClient = idAnalyzerClient;
            //_idAnalyzerService = idAnalyzerService;
        }

        /// <summary>
        /// Company to assign a new company-owned account/entity to. During the
        /// single-company transition this resolves to the sole company even for
        /// anonymous registration; multi-company onboarding passes it explicitly
        /// (a later phase). Commuters are platform-wide and are NOT stamped.
        /// </summary>
        private string? ResolveOwningCompany() => _tenant.EffectiveCompanyId;


        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserRegistrationRequest userRequest)
        {
            if (userRequest == null ||
                string.IsNullOrWhiteSpace(userRequest.Name) ||
                string.IsNullOrWhiteSpace(userRequest.Email) ||
                string.IsNullOrWhiteSpace(userRequest.PasswordHash))
            {
                return BadRequest(new { Success = false, Message = "Name, email, and password are required." });
            }

            // Check for existing user by email
            var existingUser = await _userService.FindByEmailAsync(userRequest.Email);
            if (existingUser != null)
            {
                return Conflict(new { Success = false, Message = "User with this email already exists." });
            }

            /* Analyze document and face images if provided
            if (!string.IsNullOrWhiteSpace(userRequest.DocumentImageBase64) && !string.IsNullOrWhiteSpace(userRequest.FaceImageBase64))
            {
                var analysisResult = await _idAnalyzerService.AnalyzeDocumentAsync(
                    userRequest.DocumentImageBase64,
                    userRequest.FaceImageBase64
                );

                // If document analysis fails, return a bad request and prevent user creation
                if (!analysisResult.Success)
                {
                    return BadRequest(new { Success = false, Message = "Document analysis failed: " + analysisResult.Message });
                }
            }*/

            // Create and save user in database if document analysis is successful
            var role = userRequest.Role ?? "User";
            // Company-owned roles (Admin/Driver) are stamped with the owning company;
            // commuters are platform-wide and stay company-less.
            var isCompanyOwned = role == "Admin" || role == "Driver";
            var user = new UserItem
            {
                Name = userRequest.Name,
                Email = userRequest.Email,
                PasswordHash = HashPassword(userRequest.PasswordHash),
                PhoneNumber = userRequest.PhoneNumber,
                Role = role,
                CompanyId = isCompanyOwned ? ResolveOwningCompany() : null,
                //DocumentImageBase64 = userRequest.DocumentImageBase64,
                //FaceImageBase64 = userRequest.FaceImageBase64,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _userService.CreateUserAsync(user);

            return CreatedAtAction(nameof(Register), new { id = user.Id }, new { Success = true, User = user });
        }


        // Tier 1: drivers are created by their company admin (web console → POST
        // /api/admin/drivers). Anonymous self-registration is closed — it cannot
        // resolve an owning company once more than one company exists.
        [HttpPost("driver/register")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RegisterDriver([FromBody] DriverRegistrationRequest driverRequest)
        {
            if (string.IsNullOrWhiteSpace(driverRequest.Email) ||
                string.IsNullOrWhiteSpace(driverRequest.Username) ||
                string.IsNullOrWhiteSpace(driverRequest.Password) ||
                string.IsNullOrWhiteSpace(driverRequest.PlateNumber))
            {
                return BadRequest("Email, username, password, and plate number are required.");
            }
            // Check if email already exists
            var existingEmail = await _userService.FindByEmailAsync(driverRequest.Email);
            if (existingEmail != null)
            {
                return Conflict("Driver with this email already exists.");
            }
            // Check if username already exists
            var existingUser = await _userService.FindByUsernameAsync(driverRequest.Username);
            if (existingUser != null)
            {
                return Conflict("Driver with this username already exists.");
            }

            // A driver belongs to the operator that onboards them.
            var owningCompany = ResolveOwningCompany();
            var driver = new UserItem
            {
                Name = driverRequest.Username,
                Email = driverRequest.Email, // ← Add this
                PasswordHash = HashPassword(driverRequest.Password),
                Role = "Driver",
                CompanyId = owningCompany,
                PlateNumber = driverRequest.PlateNumber,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _userService.CreateUserAsync(driver);

            // ✅ Automatically create a vehicle for this driver (same owning company)
            var vehicleService = new VehicleService(_userService._database); // Pass same database instance
            var existingVehicle = await vehicleService.GetVehicleByPuvAsync(driver.PlateNumber);
            if (existingVehicle == null)
            {
                var newVehicle = new VehicleModel
                {
                    PuvNo = driver.PlateNumber,
                    CompanyId = owningCompany,
                    CurrentLat = 0,
                    CurrentLong = 0,
                    PassengerCount = 0,
                    MaxPassengerCount = 18
                };
                await vehicleService.CreateVehicleAsync(newVehicle);
            }

            return CreatedAtAction(nameof(RegisterDriver), new { id = driver.Id }, driver);
        }





        [HttpPost("logout")]
        public IActionResult Logout()
        {
            return Ok("Logged out successfully.");
        }

        //[Authorize(Roles = "Admin")]
        [HttpPost("admin/register")]
        public async Task<IActionResult> RegisterAdmin([FromBody] UserRegistrationRequest adminRequest)
        {
            if (adminRequest == null ||
                string.IsNullOrWhiteSpace(adminRequest.Name) ||
                string.IsNullOrWhiteSpace(adminRequest.Email) ||
                string.IsNullOrWhiteSpace(adminRequest.PasswordHash))
            {
                return BadRequest("Invalid admin data.");
            }

            var existingAdmin = await _userService.FindByEmailAsync(adminRequest.Email);
            if (existingAdmin != null)
            {
                return Conflict("Admin with this email already exists.");
            }

            var adminUser = new UserItem
            {
                Name = adminRequest.Name,
                Email = adminRequest.Email,
                PasswordHash = HashPassword(adminRequest.PasswordHash),
                PhoneNumber = adminRequest.PhoneNumber,
                Role = "Admin",  // Explicitly assign the Admin role
                CompanyId = ResolveOwningCompany(), // never leave a company admin company-less
                ResetToken = null,
                ResetTokenExpiry = null
            };

            await _userService.CreateUserAsync(adminUser);
            return CreatedAtAction(nameof(RegisterAdmin), new { id = adminUser.Id }, adminUser);
        }



        [HttpPost("login")]
        [EnableRateLimiting("login")]
        public async Task<IActionResult> Login([FromBody] UserLoginRequest loginRequest)
        {
            if (loginRequest == null || string.IsNullOrWhiteSpace(loginRequest.Email) || string.IsNullOrWhiteSpace(loginRequest.PasswordHash))
            {
                return BadRequest("Email and password are required.");
            }

            var user = await _userService.FindByEmailAsync(loginRequest.Email);
            if (user == null || !VerifyPassword(user.PasswordHash, loginRequest.PasswordHash))
            {
                return Unauthorized("Invalid email or password.");
            }
            if (user.Status == "Disabled")
            {
                return Unauthorized("This account has been disabled. Contact your company admin.");
            }

            var token = GenerateJwtToken(user);
            return Ok(new LoginResponse { Token = token, User = user });
        }


        private string GenerateJwtToken(UserItem user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes("Yxg/R2jDGHJpLz0LeU8s9y8RcY3ThVwB9yZ9V6n1yQI=");
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            };
            // Multi-tenancy claims (Phase 1): scope + platform capability.
            if (!string.IsNullOrEmpty(user.CompanyId))
                claims.Add(new Claim("companyId", user.CompanyId));
            if (user.IsPlatformAdmin)
                claims.Add(new Claim("platform_admin", "true"));
            // Forces the client into the change-temp-password flow; dropped once
            // a permanent password is set (a fresh token is issued on change).
            if (user.MustChangePassword)
                claims.Add(new Claim("must_change_password", "true"));

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private bool VerifyPassword(string hashedPassword, string password)
        {
            return BCrypt.Net.BCrypt.Verify(password, hashedPassword);
        }

        [HttpPost("forgot-password")]
        [EnableRateLimiting("password-reset")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest("Email is required.");
            }

            var token = GenerateResetToken();
            var expiry = DateTime.UtcNow.AddMinutes(15);
            // Only the hash is persisted — a database leak does not expose usable codes.
            var success = await _userService.UpdateResetTokenAsync(request.Email, HashToken(token), expiry);

            if (success)
            {
                var subject = "Password Reset Request";
                var body = $"<p>Your OnDaGO password reset code is <strong>{token}</strong>. " +
                           "It expires in 15 minutes. If you did not request this, you can ignore this email.</p>";
                await _emailService.SendEmailAsync(request.Email, subject, body);
            }

            // Same response whether or not the account exists — prevents email enumeration.
            return Ok("If an account exists for that email, a reset code has been sent.");
        }

        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetUserProfile()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated.");
            }

            var user = await _userService.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound("User not found.");
            }


            var userProfile = new
            {
                user.Name,
                user.Email,
                user.PhoneNumber,
                user.PlateNumber

            };

            return Ok(userProfile);
        }

        [Authorize]
        [HttpDelete("delete-account")]
        public async Task<IActionResult> DeleteAccount()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated.");
            }

            var user = await _userService.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound("User not found.");
            }

            await _userService.DeleteUserAsync(userId);
            return Ok("Account deleted successfully.");
        }

        [Authorize]
        [HttpPut("edit-profile")]
        public async Task<IActionResult> EditProfile([FromBody] UpdateProfileRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User ID is missing from the token.");
            }

            var user = await _userService.FindByIdAsync(userId);

            if (user == null)
            {
                return NotFound("User not found.");
            }


            user.Name = request.Name;
            user.PhoneNumber = request.PhoneNumber;
            user.UpdatedAt = DateTime.UtcNow;

            await _userService.UpdateUserAsync(user);

            return Ok(user);
        }




        private const int MaxResetAttempts = 5;

        [HttpPost("change-password")]
        [EnableRateLimiting("password-reset")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.NewPassword) ||
                string.IsNullOrWhiteSpace(request.Token))
            {
                return BadRequest("Email, token, and new password are required.");
            }

            if (request.NewPassword.Length < 8)
            {
                return BadRequest("Password must be at least 8 characters.");
            }

            var user = await _userService.FindByEmailAsync(request.Email);

            // Generic failure message throughout — never reveal which check failed.
            const string invalidMessage = "Invalid or expired reset code.";

            if (user == null || string.IsNullOrEmpty(user.ResetToken) ||
                user.ResetTokenExpiry == null || user.ResetTokenExpiry < DateTime.UtcNow)
            {
                return Unauthorized(invalidMessage);
            }

            if (user.ResetTokenAttempts >= MaxResetAttempts)
            {
                await _userService.ClearResetTokenAsync(request.Email);
                return Unauthorized("Too many attempts. Request a new reset code.");
            }

            if (!TokenMatches(request.Token, user.ResetToken))
            {
                var attempts = await _userService.IncrementResetTokenAttemptsAsync(request.Email);
                if (attempts >= MaxResetAttempts)
                {
                    // Burn the token — brute force gets 5 tries per code, not 900k.
                    await _userService.ClearResetTokenAsync(request.Email);
                    return Unauthorized("Too many attempts. Request a new reset code.");
                }
                return Unauthorized(invalidMessage);
            }

            user.PasswordHash = HashPassword(request.NewPassword);
            user.ResetToken = null;
            user.ResetTokenExpiry = null;
            user.ResetTokenAttempts = 0;

            await _userService.UpdateUserAsync(user);

            return Ok("Password changed successfully.");
        }

        /// <summary>
        /// Authenticated password change for an account on a temporary password
        /// (freshly created / SuperAdmin-reset company admin). Verifies the current
        /// temp password, sets a permanent one, clears the must-change gate, and
        /// returns a FRESH token (without the must_change_password claim).
        /// </summary>
        [HttpPost("change-temp-password")]
        [Authorize]
        [EnableRateLimiting("password-reset")]
        public async Task<IActionResult> ChangeTempPassword([FromBody] ChangeTempPasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.CurrentPassword) ||
                string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest("Current and new password are required.");
            }
            if (request.NewPassword.Length < 8)
                return BadRequest("Password must be at least 8 characters.");

            var email = User.FindFirst(ClaimTypes.Email)?.Value;
            if (string.IsNullOrEmpty(email)) return Unauthorized();

            var user = await _userService.FindByEmailAsync(email);
            if (user == null || !VerifyPassword(user.PasswordHash, request.CurrentPassword))
                return Unauthorized("Current password is incorrect.");
            if (request.NewPassword == request.CurrentPassword)
                return BadRequest("New password must be different from the temporary password.");

            var newHash = HashPassword(request.NewPassword);
            await _userService.SetPasswordAndClearMustChangeAsync(email, newHash);

            user.PasswordHash = newHash;
            user.MustChangePassword = false;
            var token = GenerateJwtToken(user); // no must_change_password claim now
            return Ok(new LoginResponse { Token = token, User = user });
        }

        private string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }

        /// <summary>Cryptographically secure 6-digit code (System.Random is predictable).</summary>
        private static string GenerateResetToken()
        {
            return RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        }

        private static string HashToken(string token)
        {
            return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
        }

        /// <summary>Constant-time comparison of the submitted code against the stored hash.</summary>
        private static bool TokenMatches(string submittedToken, string storedHash)
        {
            var submittedHash = Encoding.UTF8.GetBytes(HashToken(submittedToken));
            var stored = Encoding.UTF8.GetBytes(storedHash);
            return submittedHash.Length == stored.Length &&
                   CryptographicOperations.FixedTimeEquals(submittedHash, stored);
        }

    }

    /*public class VerifyIdRequest
    {
        public string DocumentImageBase64 { get; set; }
        public string SelfieImage { get; set; }
    }*/


    public class LoginResponse
    {
        public string Token { get; set; }
        public UserItem User { get; set; }
    }


    public class UserLoginRequest
    {
        public string Email { get; set; }
        public string PasswordHash { get; set; }
    }

    public class ForgotPasswordRequest
    {
        public string Email { get; set; }
    }

    public class ChangePasswordRequest
    {
        public string Email { get; set; }
        public string Token { get; set; }
        public string NewPassword { get; set; }
    }

    public class ChangeTempPasswordRequest
    {
        public string CurrentPassword { get; set; }
        public string NewPassword { get; set; }
    }

    public class UpdateProfileRequest
    {
        public string Name { get; set; }
        public string PhoneNumber { get; set; }
    }



}