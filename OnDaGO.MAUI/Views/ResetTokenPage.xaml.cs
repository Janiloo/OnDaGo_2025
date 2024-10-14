using OnDaGO.MAUI.Models;
using System;
using System.Net.Http;
using OnDaGO.MAUI.Services;

namespace OnDaGO.MAUI.Views
{
    public partial class ResetTokenPage : ContentPage
    {
        private string _userEmail;
        public ResetTokenPage(string email)
        {
            InitializeComponent();
            _userEmail = email;
            SetEmailMessage();
        }

        private void SetEmailMessage()
        {
            emailMessageLabel.Text = $"Please enter the 6-digit code sent to {_userEmail}.";
        }

        private async void OnResetPasswordClicked(object sender, EventArgs e)
        {
            string token = $"{otpBox1.Text}{otpBox2.Text}{otpBox3.Text}{otpBox4.Text}{otpBox5.Text}{otpBox6.Text}";
            string newPassword = NewPasswordEntry.Text;
            string confirmPassword = ConfirmPasswordEntry.Text;

            errorLabel.IsVisible = false; // Hide error label initially

            // Check if any fields are empty
            if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(newPassword) || string.IsNullOrWhiteSpace(confirmPassword))
            {
                errorLabel.Text = "Please fill in all fields.";
                errorLabel.IsVisible = true;
                return;
            }

            // Check if the new password and confirm password match
            if (newPassword != confirmPassword)
            {
                errorLabel.Text = "Passwords do not match.";
                errorLabel.IsVisible = true;
                return;
            }

            // Ensure OTP token is exactly 6 digits long
            if (token.Length != 6)
            {
                errorLabel.Text = "Invalid code. Please enter the 6-digit code.";
                errorLabel.IsVisible = true;
                return;
            }

            var request = new ChangePasswordRequest { Email = _userEmail, Token = token, NewPassword = newPassword };

            try
            {
                var response = await App.AuthApi.ChangePassword(request);
                if (response.IsSuccessStatusCode)
                {
                    await DisplayAlert("Success", "Your password has been reset successfully.", "OK");
                    await Navigation.PushAsync(new LoginPage());
                }
                else
                {
                    // Check for specific error in the response, like invalid OTP token
                    if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                    {
                        errorLabel.Text = "Invalid or incorrect code. Please try again.";
                        errorLabel.IsVisible = true;
                    }
                    else
                    {
                        errorLabel.Text = "Failed to reset password. Please try again.";
                        errorLabel.IsVisible = true;
                    }
                }
            }
            catch (Exception ex)
            {
                errorLabel.Text = $"An unexpected error occurred: {ex.Message}";
                errorLabel.IsVisible = true;
            }
        }


        private void OnOtpBoxTextChanged(object sender, TextChangedEventArgs e)
        {
            Entry entry = (Entry)sender;

            // Move to the next Entry when a digit is entered
            if (entry.Text.Length == 1)
            {
                if (entry == otpBox1)
                {
                    otpBox2.Focus();
                }
                else if (entry == otpBox2)
                {
                    otpBox3.Focus();
                }
                else if (entry == otpBox3)
                {
                    otpBox4.Focus();
                }
                else if (entry == otpBox4)
                {
                    otpBox5.Focus();
                }
                else if (entry == otpBox5)
                {
                    otpBox6.Focus();
                }
            }
            // Move back to the previous Entry if deleted
            else if (entry.Text.Length == 0)
            {
                if (entry == otpBox2)
                {
                    otpBox1.Focus();
                }
                else if (entry == otpBox3)
                {
                    otpBox2.Focus();
                }
                else if (entry == otpBox4)
                {
                    otpBox3.Focus();
                }
                else if (entry == otpBox5)
                {
                    otpBox4.Focus();
                }
                else if (entry == otpBox6)
                {
                    otpBox5.Focus();
                }
            }
        }
    }
}
