using Microsoft.EntityFrameworkCore;
using UCCTicketing.API.Data;
using UCCTicketing.API.DTOs;
using UCCTicketing.API.Entities;

namespace UCCTicketing.API.Services;

public interface ISettingsService
{
    Task<Dictionary<string, Dictionary<string, string>>> GetAllSettingsAsync();
    Task<Dictionary<string, string>> GetSettingsByCategoryAsync(string category);
    Task<string?> GetSettingAsync(string category, string key);
    Task<bool> UpdateSettingAsync(string category, string key, string value, int modifiedBy);
    Task<bool> UpdateSettingsAsync(Dictionary<string, Dictionary<string, string>> settings, int modifiedBy);
}

public class SettingsService : ISettingsService
{
    private readonly UCCDbContext _context;
    private readonly ILogger<SettingsService> _logger;

    public SettingsService(UCCDbContext context, ILogger<SettingsService> logger)
    {
        _context = context;
        _logger = logger;
    }
    // Get all settings grouped by category
    public async Task<Dictionary<string, Dictionary<string, string>>> GetAllSettingsAsync()
    {
        var settings = await _context.SystemSettings
            .Where(s => s.IsActive)
            .OrderBy(s => s.Category)
            .ThenBy(s => s.SettingKey)
            .ToListAsync();

        var result = new Dictionary<string, Dictionary<string, string>>();

        foreach (var setting in settings)
        {
            if (!result.ContainsKey(setting.Category))
            {
                result[setting.Category] = new Dictionary<string, string>();
            }
            result[setting.Category][setting.SettingKey] = setting.SettingValue ?? "";
        }

        return result;
    }

    // Get settings for a specific category
    public async Task<Dictionary<string, string>> GetSettingsByCategoryAsync(string category)
    {
        var settings = await _context.SystemSettings
            .Where(s => s.IsActive && s.Category == category)
            .ToListAsync();

        return settings.ToDictionary(s => s.SettingKey, s => s.SettingValue ?? "");
    }

    // Get a specific setting value
    public async Task<string?> GetSettingAsync(string category, string key)
    {
        var setting = await _context.SystemSettings
            .FirstOrDefaultAsync(s => s.Category == category && s.SettingKey == key && s.IsActive);

        return setting?.SettingValue;
    }

    // Update a single setting
    public async Task<bool> UpdateSettingAsync(string category, string key, string value, int modifiedBy)
    {
        try
        {
            var setting = await _context.SystemSettings
                .FirstOrDefaultAsync(s => s.Category == category && s.SettingKey == key);

            if (setting == null)
            {
                // Create new setting if it doesn't exist
                setting = new SystemSetting
                {
                    Category = category,
                    SettingKey = key,
                    SettingValue = value,
                    DataType = "string",
                    ModifiedBy = modifiedBy,
                    ModifiedOn = DateTime.UtcNow
                };
                _context.SystemSettings.Add(setting);
            }
            else
            {
                setting.SettingValue = value;
                setting.ModifiedBy = modifiedBy;
                setting.ModifiedOn = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating setting {Category}.{Key}", category, key);
            return false;
        }
    }

    // Update multiple settings at once
    public async Task<bool> UpdateSettingsAsync(Dictionary<string, Dictionary<string, string>> settings, int modifiedBy)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            foreach (var category in settings)
            {
                foreach (var setting in category.Value)
                {
                    var existingSetting = await _context.SystemSettings
                        .FirstOrDefaultAsync(s => s.Category == category.Key && s.SettingKey == setting.Key);

                    if (existingSetting == null)
                    {
                        // Create new setting
                        existingSetting = new SystemSetting
                        {
                            Category = category.Key,
                            SettingKey = setting.Key,
                            SettingValue = setting.Value,
                            DataType = InferDataType(setting.Value),
                            ModifiedBy = modifiedBy,
                            ModifiedOn = DateTime.UtcNow
                        };
                        _context.SystemSettings.Add(existingSetting);
                    }
                    else
                    {
                        existingSetting.SettingValue = setting.Value;
                        existingSetting.ModifiedBy = modifiedBy;
                        existingSetting.ModifiedOn = DateTime.UtcNow;
                    }
                }
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error updating settings");
            return false;
        }
    }

    // Infer the data type from a string value
    private static string InferDataType(string value)
    {
        if (bool.TryParse(value, out _)) return "bool";
        if (int.TryParse(value, out _)) return "int";
        if (value.StartsWith("{") || value.StartsWith("[")) return "json";
        return "string";
    }
}
