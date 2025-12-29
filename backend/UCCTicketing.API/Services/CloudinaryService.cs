using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Options;

namespace UCCTicketing.API.Services;

public class CloudinarySettings
{
    public string CloudName { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string ApiSecret { get; set; } = string.Empty;
}

public interface ICloudinaryService
{
    Task<(string Url, string PublicId)?> UploadImageAsync(Stream fileStream, string fileName);
    Task<bool> DeleteImageAsync(string publicId);
}

public class CloudinaryService : ICloudinaryService
{
    private readonly Cloudinary _cloudinary;
    private readonly ILogger<CloudinaryService> _logger;
    private readonly CloudinarySettings _settings;

    public CloudinaryService(IOptions<CloudinarySettings> settings, ILogger<CloudinaryService> logger)
    {
        _logger = logger;
        _settings = settings.Value;
        
        // Log configuration (without secret)
        _logger.LogInformation("Cloudinary configured with CloudName: {CloudName}, ApiKey: {ApiKey}", 
            _settings.CloudName, _settings.ApiKey);
        
        // Validate settings
        if (string.IsNullOrEmpty(_settings.CloudName) || 
            string.IsNullOrEmpty(_settings.ApiKey) || 
            string.IsNullOrEmpty(_settings.ApiSecret))
        {
            _logger.LogError("Cloudinary settings are not properly configured!");
        }
        
        var account = new Account(
            _settings.CloudName,
            _settings.ApiKey,
            _settings.ApiSecret
        );
        
        _cloudinary = new Cloudinary(account);
        _cloudinary.Api.Secure = true; // Use HTTPS
    }

    public async Task<(string Url, string PublicId)?> UploadImageAsync(Stream fileStream, string fileName)
    {
        try
        {
            _logger.LogInformation("Attempting to upload file: {FileName} to Cloudinary", fileName);
            
            // Reset stream position if possible
            if (fileStream.CanSeek)
            {
                fileStream.Position = 0;
            }
            
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(fileName, fileStream),
                Folder = "ucc-ticketing/activities",
                UseFilename = true,
                UniqueFilename = true,
                Overwrite = false
            };

            _logger.LogInformation("Calling Cloudinary UploadAsync...");
            var uploadResult = await _cloudinary.UploadAsync(uploadParams);
            _logger.LogInformation("Cloudinary response received. StatusCode: {StatusCode}", uploadResult.StatusCode);

            if (uploadResult.Error != null)
            {
                _logger.LogError("Cloudinary upload error: {Error}, StatusCode: {StatusCode}", 
                    uploadResult.Error.Message, uploadResult.StatusCode);
                return null;
            }
            
            if (uploadResult.SecureUrl == null)
            {
                _logger.LogError("Cloudinary upload returned no SecureUrl. PublicId: {PublicId}, StatusCode: {StatusCode}", 
                    uploadResult.PublicId, uploadResult.StatusCode);
                return null;
            }

            _logger.LogInformation("Successfully uploaded to Cloudinary. URL: {Url}, PublicId: {PublicId}", 
                uploadResult.SecureUrl, uploadResult.PublicId);
            
            return (uploadResult.SecureUrl.ToString(), uploadResult.PublicId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception while uploading to Cloudinary. CloudName: {CloudName}, FileName: {FileName}", 
                _settings.CloudName, fileName);
            return null;
        }
    }



    public async Task<bool> DeleteImageAsync(string publicId)
    {
        try
        {
            var deleteParams = new DeletionParams(publicId);
            var result = await _cloudinary.DestroyAsync(deleteParams);
            return result.Result == "ok";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting from Cloudinary");
            return false;
        }
    }
}
