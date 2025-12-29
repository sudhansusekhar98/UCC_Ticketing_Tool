namespace UCCTicketing.API.DTOs;

// Activity DTOs
public class TicketActivityDto
{
    public int ActivityId { get; set; }
    public int TicketId { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;
    public string ActivityType { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsInternal { get; set; }
    public DateTime CreatedOn { get; set; }
    public List<AttachmentDto> Attachments { get; set; } = new();
}

public class CreateActivityRequest
{
    public string Content { get; set; } = string.Empty;
    public string ActivityType { get; set; } = "Comment";
    public bool IsInternal { get; set; } = false;
}

public class AttachmentDto
{
    public int AttachmentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string StorageType { get; set; } = string.Empty;
    public string? Url { get; set; }
    public DateTime UploadedOn { get; set; }
    public string UploadedByName { get; set; } = string.Empty;
}

public class UploadAttachmentResponse
{
    public int AttachmentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string StorageType { get; set; } = string.Empty;
}
