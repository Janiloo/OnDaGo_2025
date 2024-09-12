using Microsoft.AspNetCore.Mvc;
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

namespace OnDaGo.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly UserService _userService;
        private readonly EmailService _emailService;

        public UsersController(UserService userService, EmailService emailService)
        {
            _userService = userService;
            _emailService = emailService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserRegistrationRequest userRequest)
        {
            if (userRequest == null ||
                string.IsNullOrWhiteSpace(userRequest.Name) ||
                string.IsNullOrWhiteSpace(userRequest.Email) ||
                string.IsNullOrWhiteSpace(userRequest.PasswordHash))
            {
                return BadRequest("Invalid user data. Name, email, and password are required.");
            }

            var existingUser = await _userService.FindByEmailAsync(userRequest.Email);
            if (existingUser != null)
            {
                return Conflict("User with this email already exists.");
            }

            // Default role to 'User' if not provided
            var role = string.IsNullOrWhiteSpace(userRequest.Role) ? "User" : userRequest.Role;

            var user = new UserItem
            {
                Name = userRequest.Name,
                Email = userRequest.Email,
                PasswordHash = HashPassword(userRequest.PasswordHash),
                PhoneNumber = userRequest.PhoneNumber,
                Role = role,  // Assign the role
                ResetToken = null,
                ResetTokenExpiry = null
            };

            await _userService.CreateUserAsync(user);
            return CreatedAtAction(nameof(Register), new { id = user.Id }, user);
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
                ResetToken = null,
                ResetTokenExpiry = null
            };

            await _userService.CreateUserAsync(adminUser);
            return CreatedAtAction(nameof(RegisterAdmin), new { id = adminUser.Id }, adminUser);
        }



        [HttpPost("login")]
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

            var token = GenerateJwtToken(user);
            return Ok(new LoginResponse { Token = token, User = user });
        }


        private string GenerateJwtToken(UserItem user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes("Yxg/R2jDGHJpLz0LeU8s9y8RcY3ThVwB9yZ9V6n1yQI="); // Use your actual secret key here
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new Claim[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role)  // Include the user's role in the token
                }),
                Expires = DateTime.UtcNow.AddDays(7), // Token valid for 7 days
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
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest("Email is required.");
            }

            var token = GenerateResetToken();
            var expiry = DateTime.UtcNow.AddHours(1);
            var success = await _userService.UpdateResetTokenAsync(request.Email, token, expiry);

            if (success)
            {
                var subject = "Password Reset Request";
                var body = $"<p>To reset your password, please use the following token: <strong>{token}</strong></p>";
                await _emailService.SendEmailAsync(request.Email, subject, body);

                return Ok("Reset token sent to email.");
            }
            return NotFound("User not found.");
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

            // Create a response model with only the required properties
            var userProfile = new
            {
                user.Name,
                user.Email,
                user.PhoneNumber
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

            // Update user details
            user.Name = request.Name;
            user.PhoneNumber = request.PhoneNumber;
            user.UpdatedAt = DateTime.UtcNow;

            await _userService.UpdateUserAsync(user);

            return Ok(user);
        }




        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.NewPassword) ||
                string.IsNullOrWhiteSpace(request.Token))
            {
                return BadRequest("Email, token, and new password are required.");
            }

            var user = await _userService.FindByEmailAsync(request.Email);
            if (user == null || user.ResetToken != request.Token ||
                user.ResetTokenExpiry < DateTime.UtcNow)
            {
                return Unauthorized("Invalid token or token has expired.");
            }

            user.PasswordHash = HashPassword(request.NewPassword);
            user.ResetToken = null;
            user.ResetTokenExpiry = null;

            await _userService.UpdateUserAsync(user);

            return Ok("Password changed successfully.");
        }

        private string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }

        private string GenerateResetToken()
        {
            return Guid.NewGuid().ToString();
        }
    }

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

    public class UpdateProfileRequest
    {
        public string Name { get; set; }
        public string PhoneNumber { get; set; }
        // Add other fields as needed
    }

}
