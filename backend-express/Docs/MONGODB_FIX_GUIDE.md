# MongoDB Atlas Connection Fix Guide

## Current Issue

```
Error connecting to MongoDB: querySrv ECONNREFUSED _mongodb._tcp.vlaccess.4xch4e4.mongodb.net
```

## Solutions (Try in Order)

### ✅ Solution 1: Whitelist Your IP Address (Most Common Fix)

1. **Go to MongoDB Atlas**: https://cloud.mongodb.com/
2. **Navigate**: Clusters → Network Access
3. **Click**: "Add IP Address"
4. **Options**:
   - **Development**: Click "Allow Access from Anywhere" (`0.0.0.0/0`)
   - **Production**: Add your specific IP address
5. **Save** and wait 1-2 minutes for the change to propagate
6. **Restart** your backend server

### ✅ Solution 2: Verify Database User Credentials

1. **Go to**: Database Access in MongoDB Atlas
2. **Verify**: User `sekhar_db_user` exists
3. **Password**: Ensure the password is `duIt4u0UJmxyozxM` (check for typos)
4. **If needed**: Reset the password and update `.env`

### ✅ Solution 3: Use Standard Connection String (Instead of SRV)

If DNS resolution fails, try the standard format:

**Current (SRV format):**

```
mongodb+srv://sekhar_db_user:duIt4u0UJmxyozxM@vlaccess.4xch4e4.mongodb.net/ucc_ticketing?retryWrites=true&w=majority
```

**Alternative (Standard format):**

1. In MongoDB Atlas, click "Connect" → "Connect your application"
2. Select "Driver: Node.js" and copy the connection string
3. It should look like:

```
mongodb://sekhar_db_user:duIt4u0UJmxyozxM@vlaccess-shard-00-00.4xch4e4.mongodb.net:27017,vlaccess-shard-00-01.4xch4e4.mongodb.net:27017,vlaccess-shard-00-02.4xch4e4.mongodb.net:27017/ucc_ticketing?ssl=true&replicaSet=atlas-xxxxx-shard-0&authSource=admin&retryWrites=true&w=majority
```

4. Update your `.env` file with this connection string

### ✅ Solution 4: Check Firewall/Antivirus

- **Windows Firewall**: May block MongoDB connections
- **Corporate Network**: May restrict cloud database access
- **VPN**: Try disconnecting/connecting to see if it helps

### ✅ Solution 5: DNS Resolution Test

Test if your system can resolve MongoDB's DNS:

```powershell
nslookup vlaccess.4xch4e4.mongodb.net
```

If this fails, you have a DNS issue. Solutions:

- Change DNS to Google DNS (8.8.8.8, 8.8.4.4)
- Flush DNS cache: `ipconfig /flushdns`
- Restart your network adapter

### ✅ Solution 6: Verify Cluster Status

1. Check if your MongoDB Atlas cluster is running
2. Ensure it's not paused (free tier clusters pause after inactivity)
3. Resume if needed

## Testing After Fix

Once you've applied a fix, restart your backend:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

You should see:

```
✅ MongoDB Connected: vlaccess-shard-00-00.4xch4e4.mongodb.net
✅ Database: ucc_ticketing
```

## Still Not Working?

Try the local MongoDB option temporarily:

```env
# In .env file
MONGODB_URI=mongodb://localhost:27017/ucc_ticketing
```

This requires MongoDB to be installed locally.
