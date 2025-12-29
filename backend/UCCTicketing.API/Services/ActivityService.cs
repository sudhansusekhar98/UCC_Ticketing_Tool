using Microsoft.EntityFrameworkCore;
using UCCTicketing.API.Data;
using UCCTicketing.API.DTOs;
using UCCTicketing.API.Entities;

namespace UCCTicketing.API.Services;

public interface IActivityService
{
    Task<ApiResponse<List<TicketActivityDto>>> GetActivitiesByTicketAsync(int ticketId, int userId, string userRole);
    Task<ApiResponse<TicketActivityDto>> CreateActivityAsync(int ticketId, CreateActivityRequest request, int userId);
    Task<ApiResponse<UploadAttachmentResponse>> UploadAttachmentAsync(int ticketId, int? activityId, IFormFile file, int userId);
    Task<ApiResponse<byte[]>> DownloadAttachmentAsync(int attachmentId);
    Task<ApiResponse<bool>> DeleteAttachmentAsync(int attachmentId, int userId);
}

public class ActivityService : IActivityService
{
    private readonly UCCDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly ILogger<ActivityService> _logger;

    private readonly string[] ImageExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp" };
    private readonly string[] DocumentExtensions = { ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv" };
    private const long MaxFileSize = 10 * 1024 * 1024; // 10MB

    public ActivityService(
        UCCDbContext context,
        ICloudinaryService cloudinaryService,
        ILogger<ActivityService> logger)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
        _logger = logger;
    }

    public async Task<ApiResponse<List<TicketActivityDto>>> GetActivitiesByTicketAsync(int ticketId, int userId, string userRole)
    {
        try
        {
            var query = _context.TicketActivities
                .Include(a => a.User)
                .Include(a => a.Attachments)
                    .ThenInclude(att => att.Uploader)
                .Where(a => a.TicketId == ticketId)
                .OrderBy(a => a.CreatedOn);

            // ClientViewer cannot see internal notes
            if (userRole == "ClientViewer")
            {
                query = (IOrderedQueryable<TicketActivity>)query.Where(a => !a.IsInternal);
            }

            var activities = await query.ToListAsync();

            var result = activities.Select(a => new TicketActivityDto
            {
                ActivityId = a.ActivityId,
                TicketId = a.TicketId,
                UserId = a.UserId,
                UserName = a.User?.FullName ?? "Unknown",
                UserRole = a.User?.Role ?? "Unknown",
                ActivityType = a.ActivityType,
                Content = a.Content,
                IsInternal = a.IsInternal,
                CreatedOn = a.CreatedOn,
                Attachments = a.Attachments.Select(att => new AttachmentDto
                {
                    AttachmentId = att.AttachmentId,
                    FileName = att.FileName,
                    ContentType = att.ContentType,
                    FileSize = att.FileSize,
                    StorageType = att.StorageType,
                    Url = att.StorageType == "Cloudinary" ? att.CloudinaryUrl : $"/api/activities/attachments/{att.AttachmentId}/download",
                    UploadedOn = att.UploadedOn,
                    UploadedByName = att.Uploader?.FullName ?? "Unknown"
                }).ToList()
            }).ToList();

            return ApiResponse<List<TicketActivityDto>>.SuccessResponse(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting activities for ticket {TicketId}", ticketId);
            return ApiResponse<List<TicketActivityDto>>.FailResponse("Failed to retrieve activities");
        }
    }

    public async Task<ApiResponse<TicketActivityDto>> CreateActivityAsync(int ticketId, CreateActivityRequest request, int userId)
    {
        try
        {
            var ticket = await _context.Tickets.FindAsync(ticketId);
            if (ticket == null)
                return ApiResponse<TicketActivityDto>.FailResponse("Ticket not found");

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return ApiResponse<TicketActivityDto>.FailResponse("User not found");

            var activity = new TicketActivity
            {
                TicketId = ticketId,
                UserId = userId,
                ActivityType = request.ActivityType,
                Content = request.Content,
                IsInternal = request.IsInternal,
                CreatedOn = DateTime.UtcNow
            };

            _context.TicketActivities.Add(activity);
            await _context.SaveChangesAsync();

            var result = new TicketActivityDto
            {
                ActivityId = activity.ActivityId,
                TicketId = activity.TicketId,
                UserId = activity.UserId,
                UserName = user.FullName,
                UserRole = user.Role,
                ActivityType = activity.ActivityType,
                Content = activity.Content,
                IsInternal = activity.IsInternal,
                CreatedOn = activity.CreatedOn,
                Attachments = new List<AttachmentDto>()
            };

            return ApiResponse<TicketActivityDto>.SuccessResponse(result, "Activity added successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating activity for ticket {TicketId}", ticketId);
            return ApiResponse<TicketActivityDto>.FailResponse("Failed to create activity");
        }
    }

    public async Task<ApiResponse<UploadAttachmentResponse>> UploadAttachmentAsync(int ticketId, int? activityId, IFormFile file, int userId)
    {
        try
        {
            _logger.LogInformation("UploadAttachmentAsync called - TicketId: {TicketId}, FileName: {FileName}, FileSize: {FileSize}, ContentType: {ContentType}", 
                ticketId, file?.FileName, file?.Length, file?.ContentType);
            
            if (file == null || file.Length == 0)
            {
                _logger.LogWarning("No file provided or file is empty");
                return ApiResponse<UploadAttachmentResponse>.FailResponse("No file provided");
            }

            if (file.Length > MaxFileSize)
            {
                _logger.LogWarning("File size {Size} exceeds limit of {MaxSize}", file.Length, MaxFileSize);
                return ApiResponse<UploadAttachmentResponse>.FailResponse("File size exceeds 10MB limit");
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var isImage = ImageExtensions.Contains(extension);
            var isDocument = DocumentExtensions.Contains(extension);
            
            _logger.LogInformation("File extension: {Extension}, IsImage: {IsImage}, IsDocument: {IsDocument}", 
                extension, isImage, isDocument);

            if (!isImage && !isDocument)
            {
                _logger.LogWarning("Unsupported file type: {Extension}", extension);
                return ApiResponse<UploadAttachmentResponse>.FailResponse("Unsupported file type. Allowed: images (jpg, png, gif, webp) and documents (pdf, doc, docx, xls, xlsx)");
            }

            var attachment = new TicketAttachment
            {
                ActivityId = activityId,
                TicketId = ticketId,
                UploadedBy = userId,
                FileName = file.FileName,
                ContentType = file.ContentType,
                FileSize = file.Length,
                UploadedOn = DateTime.UtcNow
            };

            // Store all files in database for reliability
            _logger.LogInformation("Storing file in database...");
            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            
            attachment.StorageType = "Database";
            attachment.FileData = memoryStream.ToArray();

            _context.TicketAttachments.Add(attachment);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Attachment saved successfully. AttachmentId: {AttachmentId}", attachment.AttachmentId);

            var response = new UploadAttachmentResponse
            {
                AttachmentId = attachment.AttachmentId,
                FileName = attachment.FileName,
                Url = $"/api/activities/attachments/{attachment.AttachmentId}/download",
                StorageType = attachment.StorageType
            };

            return ApiResponse<UploadAttachmentResponse>.SuccessResponse(response, "File uploaded successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception in UploadAttachmentAsync for ticket {TicketId}, file: {FileName}", ticketId, file?.FileName);
            return ApiResponse<UploadAttachmentResponse>.FailResponse("Failed to upload file: " + ex.Message);
        }
    }



    public async Task<ApiResponse<byte[]>> DownloadAttachmentAsync(int attachmentId)
    {
        try
        {
            var attachment = await _context.TicketAttachments.FindAsync(attachmentId);
            if (attachment == null)
                return ApiResponse<byte[]>.FailResponse("Attachment not found");

            if (attachment.StorageType != "Database" || attachment.FileData == null)
                return ApiResponse<byte[]>.FailResponse("File not available for download");

            return ApiResponse<byte[]>.SuccessResponse(attachment.FileData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading attachment {AttachmentId}", attachmentId);
            return ApiResponse<byte[]>.FailResponse("Failed to download file");
        }
    }

    public async Task<ApiResponse<bool>> DeleteAttachmentAsync(int attachmentId, int userId)
    {
        try
        {
            var attachment = await _context.TicketAttachments.FindAsync(attachmentId);
            if (attachment == null)
                return ApiResponse<bool>.FailResponse("Attachment not found");

            // Delete from Cloudinary if applicable
            if (attachment.StorageType == "Cloudinary" && !string.IsNullOrEmpty(attachment.CloudinaryPublicId))
            {
                await _cloudinaryService.DeleteImageAsync(attachment.CloudinaryPublicId);
            }

            _context.TicketAttachments.Remove(attachment);
            await _context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Attachment deleted successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting attachment {AttachmentId}", attachmentId);
            return ApiResponse<bool>.FailResponse("Failed to delete attachment");
        }
    }
}
