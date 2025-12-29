var hash = BCrypt.Net.BCrypt.HashPassword("Admin@123");
Console.WriteLine($"Hash for Admin@123: {hash}");
Console.WriteLine($"Verified: {BCrypt.Net.BCrypt.Verify("Admin@123", hash)}");
