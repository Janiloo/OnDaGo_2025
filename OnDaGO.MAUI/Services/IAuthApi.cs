using Refit;
using OnDaGO.MAUI.Models;
using System.Net.Http.Headers;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Maui.Storage;

namespace OnDaGO.MAUI.Services
{



    public interface IAuthApi
    {
        [Post("/api/users/register")]
        Task<UserItem> Register([Body] UserItem user);

        [Post("/api/users/forgot-password")]
        Task<HttpResponseMessage> ForgotPassword([Body] ForgotPasswordRequest request);


        [Post("/api/users/login")]
        Task<LoginResponse> Login([Body] UserItem user);

        [Post("/api/users/change-password")]
        Task<HttpResponseMessage> ChangePassword([Body] ChangePasswordRequest request);

        [Post("/api/users/logout")]
        Task<HttpResponseMessage> Logout();

        [Get("/api/users/profile")]
        Task<UserItem> GetUserProfile();

        [Delete("/api/users/delete-account")]
        Task<HttpResponseMessage> DeleteAccount();

        [Post("/api/users/admin/register")]
        Task<UserItem> RegisterAdmin([Body] UserItem adminUser);


        [Put("/api/users/edit-profile")]
        Task<HttpResponseMessage> EditProfile([Body] UpdateProfileRequest request);
    }

    public class LoginResponse
    {
        public string Token { get; set; }
        public UserItem User { get; set; }
    }

    public static class HttpClientFactory
    {
        public static HttpClient CreateClient()
        {
            var client = new HttpClient();
            var token = SecureStorage.GetAsync("jwt_token").Result;

            if (!string.IsNullOrEmpty(token))
            {
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            }

            return client;
        }

    }


}
