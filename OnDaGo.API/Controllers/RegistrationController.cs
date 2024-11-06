using Microsoft.AspNetCore.Mvc;
using OnDaGo.API.Models;
using System.Threading.Tasks;

[ApiController]
[Route("api/[controller]")]
public class RegistrationController : ControllerBase
{
    private readonly IdAnalyzerService _idAnalyzerService;

    public RegistrationController(IdAnalyzerService idAnalyzerService)
    {
        _idAnalyzerService = idAnalyzerService;
    }

    [HttpPost]
    [Route("register")]
    public async Task<IActionResult> RegisterUser([FromBody] UserRegistrationModel registrationModel)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Analyze document and face image using IdAnalyzerService
        var analysisResult = await _idAnalyzerService.AnalyzeDocumentAsync(
            registrationModel.DocumentImageBase64,
            registrationModel.FaceImageBase64
        );

        if (!analysisResult.Success)
            return BadRequest(new { Message = "Document analysis failed: " + analysisResult.Message });

        // Add code to create and save the new user here (e.g., hashing the password, saving to the database)

        return Ok(new { Message = "Registration successful!" });
    }
}
