using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UCCTicketing.API.DTOs;
using UCCTicketing.API.Entities;
using UCCTicketing.API.Services;

namespace UCCTicketing.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>
    /// Get all users with pagination
    /// </summary>
    [HttpGet]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Supervisor}")]
    public async Task<ActionResult<PagedResponse<UserDto>>> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? role = null,
        [FromQuery] bool? isActive = null)
    {
        var result = await _userService.GetUsersAsync(page, pageSize, role, isActive);
        return Ok(result);
    }

    /// <summary>
    /// Get user by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetUser(int id)
    {
        var user = await _userService.GetUserByIdAsync(id);
        if (user == null)
        {
            return NotFound(ApiResponse<UserDto>.FailResponse("User not found"));
        }
        return Ok(ApiResponse<UserDto>.SuccessResponse(user));
    }

    /// <summary>
    /// Create new user
    /// </summary>
    [HttpPost]
    [Authorize(Roles = UserRoles.Admin)]
    public async Task<ActionResult<ApiResponse<UserDto>>> CreateUser([FromBody] CreateUserRequest request)
    {
        var result = await _userService.CreateUserAsync(request);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return CreatedAtAction(nameof(GetUser), new { id = result.Data!.UserId }, result);
    }

    /// <summary>
    /// Update user
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = UserRoles.Admin)]
    public async Task<ActionResult<ApiResponse<UserDto>>> UpdateUser(int id, [FromBody] UpdateUserRequest request)
    {
        var result = await _userService.UpdateUserAsync(id, request);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Delete (deactivate) user
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = UserRoles.Admin)]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteUser(int id)
    {
        var result = await _userService.DeleteUserAsync(id);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Get users dropdown
    /// </summary>
    [HttpGet("dropdown")]
    public async Task<ActionResult<List<DropdownOption>>> GetUsersDropdown([FromQuery] string? role = null)
    {
        var result = await _userService.GetUsersDropdownAsync(role);
        return Ok(result);
    }

    /// <summary>
    /// Get engineers dropdown
    /// </summary>
    [HttpGet("engineers")]
    public async Task<ActionResult<List<DropdownOption>>> GetEngineersDropdown()
    {
        var userId = GetCurrentUserId();
        var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
        var result = await _userService.GetEngineersDropdownAsync(userId, userRole);
        return Ok(result);
    }

    /// <summary>
    /// Get users with contact info for Site form
    /// </summary>
    [HttpGet("contacts")]
    public async Task<ActionResult<List<UserContactDto>>> GetUsersWithContacts()
    {
        var result = await _userService.GetUsersContactDropdownAsync();
        return Ok(result);
    }
    
    private int GetCurrentUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        return claim != null && int.TryParse(claim.Value, out int userId) ? userId : 0;
    }
}
