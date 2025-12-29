-- Fix password hash for all users
-- Password: Admin@123
-- BCrypt Hash: $2a$11$hWFq47uN0H37eujUXiD.Ie6GbPWNo4cJDIDQlypLXDpgx9N7pq7Z.

UPDATE Users 
SET PasswordHash = '$2a$11$hWFq47uN0H37eujUXiD.Ie6GbPWNo4cJDIDQlypLXDpgx9N7pq7Z.'
WHERE UserId >= 1;

SELECT Username, PasswordHash FROM Users;
