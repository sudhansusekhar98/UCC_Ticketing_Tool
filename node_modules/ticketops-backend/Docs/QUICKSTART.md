# 🚀 Quick Start Guide - Express.js Backend

## Prerequisites Check

Before starting, ensure you have:

- ✅ Node.js (v18+) installed
- ✅ MongoDB installed (local) OR MongoDB Atlas account (cloud)
- ✅ Git Bash or PowerShell

## Step-by-Step Setup

### 1️⃣ Install MongoDB (Choose One)

#### Option A: Local MongoDB (Windows)

1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Run the installer (use default settings)
3. MongoDB will install as a Windows Service and start automatically

To verify:

```bash
mongosh
# or for older versions
mongo
```

#### Option B: MongoDB Atlas (Cloud - Recommended for beginners)

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create a free cluster (M0)
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Update `.env` file with your connection string:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ucc_ticketing
   ```

### 2️⃣ Configure Environment

1. Open `.env` file in `backend-express` folder
2. Update these values:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/ucc_ticketing
# OR for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ucc_ticketing

# Security (IMPORTANT: Change these in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345
JWT_REFRESH_SECRET=your-refresh-token-secret-change-this-67890

# Frontend URL (update if different)
CORS_ORIGIN=http://localhost:5173
```

### 3️⃣ Install Dependencies

Open terminal in `backend-express` folder:

```bash
cd "d:\VL Access\CODES\VLAccess Ticketing Tool\backend-express"
npm install
```

### 4️⃣ Seed Database with Initial Data

```bash
npm run seed
```

This will create:

- 5 default users (admin, dispatcher, engineers, supervisor)
- 4 SLA policies (P1, P2, P3, P4)

**Default Login Credentials:**

```
Admin:       username: admin      | password: Admin@123
Dispatcher:  username: dispatcher | password: Dispatcher@123
L1 Engineer: username: l1engineer | password: Engineer@123
L2 Engineer: username: l2engineer | password: Engineer@123
Supervisor:  username: supervisor | password: Supervisor@123
```

### 5️⃣ Start the Server

**Development mode (with auto-reload):**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

You should see:

```
✅ MongoDB Connected: localhost
📊 Database: ucc_ticketing
🚀 Server running on port 5000
📡 Environment: development
🌐 CORS enabled for: http://localhost:5173
```

### 6️⃣ Test the API

Open a new terminal and test the health endpoint:

```bash
curl http://localhost:5000/api/health
```

Test login:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"Admin@123\"}"
```

You should receive a token in the response!

## 🎯 Next Steps

### Update Frontend to Use New Backend

1. Open `frontend/ucc-ticketing/src/services/api.js`
2. Verify the base URL points to Express backend:

   ```javascript
   const API_BASE_URL = "http://localhost:5000";
   ```

3. Start the frontend:

   ```bash
   cd "d:\VL Access\CODES\VLAccess Ticketing Tool\frontend\ucc-ticketing"
   npm run dev
   ```

4. Test login with default credentials

### Stop the Old .NET Backend

Once you verify the Express backend is working:

1. Stop the running `dotnet run` command (Ctrl+C)
2. The frontend will now use the Express.js backend

## 🔧 Troubleshooting

### Error: "MongoDB connection failed"

**Solution:**

- Check if MongoDB service is running (Windows Services)
- Or verify your MongoDB Atlas connection string is correct
- Test connection with `mongosh` command

### Error: "Port 5000 already in use"

**Solution:**

- Stop the .NET backend first
- Or change PORT in `.env` to 5001

### Error: "Cannot find module"

**Solution:**

```bash
npm install
```

### Error: "JWT_SECRET is not defined"

**Solution:**

- Make sure `.env` file exists in `backend-express` folder
- Check that `JWT_SECRET` is set in `.env`

## 📚 Available Scripts

| Command        | Description                                 |
| -------------- | ------------------------------------------- |
| `npm start`    | Start server in production mode             |
| `npm run dev`  | Start server with auto-reload (development) |
| `npm run seed` | Seed database with initial data             |

## 🔍 Verify Everything is Working

1. ✅ MongoDB is connected (check server logs)
2. ✅ Server is running on port 5000
3. ✅ Health check endpoint works: `http://localhost:5000/api/health`
4. ✅ Login endpoint works with default credentials
5. ✅ Frontend can connect and login

## 📖 Documentation

- **README.md** - Full documentation
- **MIGRATION_GUIDE.md** - Migration from .NET to Express
- **API Documentation** - Coming soon

## 🆘 Need Help?

Common issues and solutions are in the README.md file.

## 🎉 Success!

If you can:

1. See "MongoDB Connected" in the logs
2. Login with default credentials
3. Get a JWT token back

**You're all set!** The Express.js backend is running successfully.

---

**Next:** Implement remaining API endpoints (Sites, Assets, Tickets, etc.)
