using Microsoft.EntityFrameworkCore;
using UCCTicketing.API.Data;
using UCCTicketing.API.DTOs;
using UCCTicketing.API.Entities;

namespace UCCTicketing.API.Services;

public interface IUserService
{
    Task<PagedResponse<UserDto>> GetUsersAsync(int page, int pageSize, string? role = null, bool? isActive = null);
    Task<UserDto?> GetUserByIdAsync(int userId);
    Task<ApiResponse<UserDto>> CreateUserAsync(CreateUserRequest request);
    Task<ApiResponse<UserDto>> UpdateUserAsync(int userId, UpdateUserRequest request);
    Task<ApiResponse<bool>> DeleteUserAsync(int userId);
    Task<List<DropdownOption>> GetUsersDropdownAsync(string? role = null);
    Task<List<DropdownOption>> GetEngineersDropdownAsync(int userId, string userRole);
}

public class UserService : IUserService
{
    private readonly UCCDbContext _context;
    private readonly ILogger<UserService> _logger;

    public UserService(UCCDbContext context, ILogger<UserService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PagedResponse<UserDto>> GetUsersAsync(int page, int pageSize, string? role = null, bool? isActive = null)
    {
        var query = _context.Users.Include(u => u.Site).AsQueryable();

        if (!string.IsNullOrEmpty(role))
            query = query.Where(u => u.Role == role);

        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);

        var totalCount = await query.CountAsync();

        var users = await query
            .OrderBy(u => u.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserDto
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Email = u.Email,
                Username = u.Username,
                Role = u.Role,
                MobileNumber = u.MobileNumber,
                Designation = u.Designation,
                SiteId = u.SiteId,
                SiteName = u.Site != null ? u.Site.SiteName : null,
                IsActive = u.IsActive,
                CreatedOn = u.CreatedOn,
                LastLoginOn = u.LastLoginOn
            })
            .ToListAsync();

        return new PagedResponse<UserDto>
        {
            Items = users,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<UserDto?> GetUserByIdAsync(int userId)
    {
        return await _context.Users
            .Include(u => u.Site)
            .Where(u => u.UserId == userId)
            .Select(u => new UserDto
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Email = u.Email,
                Username = u.Username,
                Role = u.Role,
                MobileNumber = u.MobileNumber,
                Designation = u.Designation,
                SiteId = u.SiteId,
                SiteName = u.Site != null ? u.Site.SiteName : null,
                IsActive = u.IsActive,
                CreatedOn = u.CreatedOn,
                LastLoginOn = u.LastLoginOn
            })
            .FirstOrDefaultAsync();
    }

    public async Task<ApiResponse<UserDto>> CreateUserAsync(CreateUserRequest request)
    {
        try
        {
            // Check if username exists
            if (await _context.Users.AnyAsync(u => u.Username == request.Username))
            {
                return ApiResponse<UserDto>.FailResponse("Username already exists");
            }

            // Check if email exists
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                return ApiResponse<UserDto>.FailResponse("Email already exists");
            }

            // Validate role
            if (!UserRoles.AllRoles.Contains(request.Role))
            {
                return ApiResponse<UserDto>.FailResponse("Invalid role specified");
            }

            var user = new UserMaster
            {
                FullName = request.FullName,
                Email = request.Email,
                Username = request.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = request.Role,
                MobileNumber = request.MobileNumber,
                Designation = request.Designation,
                SiteId = request.SiteId,
                IsActive = true,
                CreatedOn = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User {Username} created successfully", user.Username);

            var dto = await GetUserByIdAsync(user.UserId);
            return ApiResponse<UserDto>.SuccessResponse(dto!, "User created successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user");
            return ApiResponse<UserDto>.FailResponse("An error occurred while creating user");
        }
    }

    public async Task<ApiResponse<UserDto>> UpdateUserAsync(int userId, UpdateUserRequest request)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return ApiResponse<UserDto>.FailResponse("User not found");
            }

            // Check if email is taken by another user
            if (await _context.Users.AnyAsync(u => u.Email == request.Email && u.UserId != userId))
            {
                return ApiResponse<UserDto>.FailResponse("Email already exists");
            }

            // Validate role
            if (!UserRoles.AllRoles.Contains(request.Role))
            {
                return ApiResponse<UserDto>.FailResponse("Invalid role specified");
            }

            user.FullName = request.FullName;
            user.Email = request.Email;
            user.Role = request.Role;
            user.MobileNumber = request.MobileNumber;
            user.Designation = request.Designation;
            user.SiteId = request.SiteId;
            user.IsActive = request.IsActive;

            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} updated successfully", userId);

            var dto = await GetUserByIdAsync(user.UserId);
            return ApiResponse<UserDto>.SuccessResponse(dto!, "User updated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user {UserId}", userId);
            return ApiResponse<UserDto>.FailResponse("An error occurred while updating user");
        }
    }

    public async Task<ApiResponse<bool>> DeleteUserAsync(int userId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return ApiResponse<bool>.FailResponse("User not found");
            }

            // Don't delete, just deactivate
            user.IsActive = false;
            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} deactivated", userId);
            return ApiResponse<bool>.SuccessResponse(true, "User deactivated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user {UserId}", userId);
            return ApiResponse<bool>.FailResponse("An error occurred while deleting user");
        }
    }

    public async Task<List<DropdownOption>> GetUsersDropdownAsync(string? role = null)
    {
        var query = _context.Users.Where(u => u.IsActive);

        if (!string.IsNullOrEmpty(role))
            query = query.Where(u => u.Role == role);

        return await query
            .OrderBy(u => u.FullName)
            .Select(u => new DropdownOption
            {
                Value = u.UserId.ToString(),
                Label = u.FullName
            })
            .ToListAsync();
    }

    public async Task<List<DropdownOption>> GetEngineersDropdownAsync(int userId, string userRole)
    {
        // Get user's site if not admin
        int? userSiteId = null;
        bool isAdmin = userRole == UserRoles.Admin;
        
        if (!isAdmin)
        {
            var user = await _context.Users.FindAsync(userId);
            userSiteId = user?.SiteId;
        }
        
        var query = _context.Users
            .Where(u => u.IsActive && (u.Role == UserRoles.L1Engineer || u.Role == UserRoles.L2Engineer));
        
        // Filter by site for non-admins
        if (userSiteId.HasValue)
        {
            query = query.Where(u => u.SiteId == userSiteId.Value);
        }
        
        return await query
            .OrderBy(u => u.FullName)
            .Select(u => new DropdownOption
            {
                Value = u.UserId.ToString(),
                Label = $"{u.FullName} ({u.Role})"
            })
            .ToListAsync();
    }
}
