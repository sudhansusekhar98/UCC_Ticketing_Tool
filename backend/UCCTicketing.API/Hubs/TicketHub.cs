using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace UCCTicketing.API.Hubs;

[Authorize]
public class TicketHub : Hub
{
    private readonly ILogger<TicketHub> _logger;

    public TicketHub(ILogger<TicketHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var role = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            // Add user to their own group for direct notifications
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");

            // Add user to their role group
            if (!string.IsNullOrEmpty(role))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"role_{role}");
            }

            _logger.LogInformation("User {UserId} connected to TicketHub", userId);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
            _logger.LogInformation("User {UserId} disconnected from TicketHub", userId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    // Join a specific site group to receive site-specific notifications
    public async Task JoinSiteGroup(int siteId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"site_{siteId}");
        _logger.LogInformation("Connection {ConnectionId} joined site_{SiteId}", Context.ConnectionId, siteId);
    }

    public async Task LeaveSiteGroup(int siteId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"site_{siteId}");
    }

    // Methods that can be called from the client
    public async Task SendTicketUpdate(string ticketNumber, string message)
    {
        await Clients.All.SendAsync("TicketUpdated", ticketNumber, message);
    }

    public async Task NotifyUser(string userId, string message)
    {
        await Clients.Group($"user_{userId}").SendAsync("DirectNotification", message);
    }
}
