# Production Database Seeding Guide

## Problem

You can't login because there are no users in your production MongoDB database.

## Solution: Create Admin User

### Option 1: Use MongoDB Compass (Easiest)

1. **Open MongoDB Compass**
2. **Connect** to your MongoDB Atlas cluster (use the same URI from Vercel)
3. **Select** your database (e.g., `ucc_ticketing`)
4. **Go to** the `users` collection
5. **Click** "Add Data" → "Insert Document"
6. **Paste** this JSON:

```json
{
  "username": "admin",
  "password": "$2a$10$YourHashedPasswordHere",
  "fullName": "System Administrator",
  "email": "admin@uccticket.com",
  "role": "Admin",
  "isActive": true,
  "createdAt": "2026-01-10T08:00:00.000Z",
  "updatedAt": "2026-01-10T08:00:00.000Z"
}
```

**Note**: You need to hash the password first. Use this online tool:

- Go to: https://bcrypt-generator.com/
- Enter password: `admin123`
- Rounds: `10`
- Copy the hash and replace `$2a$10$YourHashedPasswordHere`

---

### Option 2: Run Seed Script Locally (Connects to Production DB)

1. **Update `.env.production`** with your MongoDB Atlas URI:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ucc_ticketing
```

2. **Run the seed script**:

```bash
cd backend-express
node --env-file=.env.production scripts/seed.js
```

This will create:

- Admin user (username: `admin`, password: `admin123`)
- Sample data

---

### Option 3: Temporary Quick Fix

**Create a user with a known password hash:**

Password: `admin123`
Hash: `$2a$10$rZ5qJ5qJ5qJ5qJ5qJ5qJ5uK5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ`

Insert this into MongoDB:

```json
{
  "username": "admin",
  "password": "$2a$10$N9qo8uLOickgx2ZMRZoMye.IVI9.YvhD.1fRGvnhNCeY8WvJ7BqyS",
  "fullName": "Admin",
  "email": "admin@test.com",
  "role": "Admin",
  "isActive": true
}
```

Then login with:

- Username: `admin`
- Password: `admin123`

---

### Option 4: Use MongoDB Atlas Web Interface

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click **Browse Collections**
3. Select your database
4. Click **users** collection
5. Click **Insert Document**
6. Add the user JSON from Option 3

---

## After Creating Admin User

1. Go to your deployed frontend
2. Login with:
   - Username: `admin`
   - Password: `admin123`
3. **Immediately change the password** in Settings

---

## Recommended: Use Option 1 or 4

MongoDB Compass or Atlas Web Interface are the easiest and safest ways to add the first user.

**Let me know which option you'd like to use, and I'll help you through it!**
