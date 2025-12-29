// Quick BCrypt hash generator for Admin@123
var hash = BCrypt.Net.BCrypt.HashPassword("Admin@123");
Console.WriteLine($"Hash: {hash}");

// Verify it works
bool verified = BCrypt.Net.BCrypt.Verify("Admin@123", hash);
Console.WriteLine($"Verified: {verified}");
