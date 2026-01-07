# UCC Ticketing Platform - Express.js + MongoDB Backend

## 🚀 Migration from .NET to Express.js

This is the new Express.js backend with MongoDB database, migrated from the original ASP.NET Core + SQL Server implementation.

### Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO
- **Password Hashing**: BCrypt

## 📋 Prerequisites

1. **Node.js** (v18 or higher)

   ```bash
   node --version
   ```

2. **MongoDB** (Local or MongoDB Atlas)
   - **Local Installation**: Download from [mongodb.com](https://www.mongodb.com/try/download/community)
   - **Cloud (MongoDB Atlas)**: Create free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

## 🛠️ Installation

1. **Navigate to backend directory**:

   ```bash
   cd "d:\VL Access\CODES\VLAccess Ticketing Tool\backend-express"
   ```

2. **Install dependencies** (already done):

   ```bash
   npm install
   ```

3. **Configure environment variables**:

   - Edit `.env` file
   - Update `MONGODB_URI` with your MongoDB connection string:

     ```env
     # For local MongoDB:
     MONGODB_URI=mongodb://localhost:27017/ucc_ticketing

     # For MongoDB Atlas:
     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ucc_ticketing
     ```

   - Update `JWT_SECRET` and `JWT_REFRESH_SECRET` with secure random strings

4. **Start MongoDB** (if using local installation):

   ```bash
   # Windows
   net start MongoDB

   # Or start mongod manually
   mongod --dbpath "C:\data\db"
   ```

## 🏃 Running the Application

### Development Mode (with auto-reload):

```bash
npm run dev
```

### Production Mode:

```bash
npm start
```

The server will start on `http://localhost:5000`

## 📁 Project Structure

```
backend-express/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   └── auth.controller.js   # Authentication logic
├── middleware/
│   └── auth.middleware.js   # JWT authentication
├── models/
│   ├── User.model.js        # User schema
│   ├── Site.model.js        # Site schema
│   ├── Asset.model.js       # Asset schema
│   ├── Ticket.model.js      # Ticket schema
│   ├── SLAPolicy.model.js   # SLA Policy schema
│   ├── TicketActivity.model.js
│   ├── TicketAttachment.model.js
│   └── WorkOrder.model.js
├── routes/
│   └── auth.routes.js       # Authentication routes
├── utils/
│   └── auth.utils.js        # Auth helper functions
├── .env                     # Environment variables
├── .gitignore
├── package.json
└── server.js                # Main application file
```

## 🔑 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user (Protected)
- `POST /api/auth/logout` - Logout (Protected)
- `PUT /api/auth/change-password` - Change password (Protected)

### Health Check

- `GET /api/health` - Server health status

## 🗄️ Database Schema Comparison

### SQL Server → MongoDB Mapping

| SQL Server Table | MongoDB Collection | Notes                                       |
| ---------------- | ------------------ | ------------------------------------------- |
| UserMaster       | users              | Auto-generated `_id` instead of `UserId`    |
| SiteMaster       | sites              | ObjectId references instead of foreign keys |
| AssetMaster      | assets             | Embedded relationships possible             |
| TicketMaster     | tickets            | Auto-generated ticket numbers               |
| SLAPolicy        | slapolicies        | Same structure                              |
| TicketActivity   | ticketactivities   | References to tickets                       |
| TicketAttachment | ticketattachments  | File storage options                        |
| WorkOrder        | workorders         | Auto-generated WO numbers                   |

### Key Differences

1. **Primary Keys**:

   - SQL: `int` auto-increment IDs
   - MongoDB: `ObjectId` (`_id`)

2. **Foreign Keys**:

   - SQL: Integer foreign keys with `[ForeignKey]` attributes
   - MongoDB: `ObjectId` references with Mongoose `ref`

3. **Timestamps**:

   - SQL: `CreatedOn`, `ModifiedOn` (manual)
   - MongoDB: `createdAt`, `updatedAt` (automatic with `timestamps: true`)

4. **Navigation Properties**:
   - SQL: `virtual ICollection<T>`
   - MongoDB: Mongoose virtuals with `populate()`

## 🔄 Data Migration

To migrate existing data from SQL Server to MongoDB:

1. **Export data from SQL Server** to JSON
2. **Use migration script** (to be created):
   ```bash
   node scripts/migrate-data.js
   ```

## 🧪 Testing the API

### Using cURL:

**Login**:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"password123\"}"
```

**Get Current User**:

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Postman or Thunder Client:

Import the API collection (to be created)

## 🔐 Security Features

- ✅ JWT-based authentication
- ✅ BCrypt password hashing
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Rate limiting (to be added)
- ✅ Input validation (to be added)

## 🚧 TODO - Remaining Routes

- [ ] Sites CRUD
- [ ] Assets CRUD
- [ ] Tickets CRUD
- [ ] Users Management
- [ ] SLA Policies
- [ ] Work Orders
- [ ] Settings
- [ ] File Upload
- [ ] Reports
- [ ] Dashboard Statistics

## 📝 Environment Variables

| Variable             | Description               | Default               |
| -------------------- | ------------------------- | --------------------- |
| `PORT`               | Server port               | 5000                  |
| `NODE_ENV`           | Environment               | development           |
| `MONGODB_URI`        | MongoDB connection string | Required              |
| `JWT_SECRET`         | JWT signing secret        | Required              |
| `JWT_EXPIRE`         | JWT expiration            | 7d                    |
| `JWT_REFRESH_SECRET` | Refresh token secret      | Required              |
| `JWT_REFRESH_EXPIRE` | Refresh token expiration  | 30d                   |
| `CORS_ORIGIN`        | Allowed CORS origin       | http://localhost:5173 |

## 🐛 Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
mongosh

# Or for older versions
mongo
```

### Port Already in Use

```bash
# Change PORT in .env file
PORT=5001
```

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [JWT.io](https://jwt.io/)

## 👥 Support

For issues or questions, contact the development team.
