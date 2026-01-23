# TicketOps - Backend

Express.js + MongoDB backend API for TicketOps with Socket.io for real-time updates.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account (for file storage)

### Local Development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   Create a `.env` file in this directory:

   ```env
   # Server
   NODE_ENV=development
   PORT=5000

   # Database
   MONGODB_URI=mongodb://localhost:27017/ucc-ticketing
   # Or MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ucc-ticketing

   # JWT
   JWT_SECRET=your-secret-key-min-32-characters
   JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-characters

   # CORS
   CORS_ORIGIN=http://localhost:5173

   # Cloudinary (Optional for local, required for production)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

3. **Generate JWT secrets**

   ```bash
   # On Windows (PowerShell)
   [Convert]::ToBase64String((1..32|%{Get-Random -Maximum 256}))

   # On Linux/Mac
   openssl rand -base64 32
   ```

4. **Seed the database (optional)**

   ```bash
   # Create admin user and sample data
   npm run seed

   # Or full seed with more sample data
   npm run seed:full
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

6. **Test the API**
   - Open http://localhost:5000/api/health
   - Should see: `{"status":"OK",...}`

## 📦 Production Deployment

See [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) for detailed instructions.

### Quick Vercel Deployment

1. **Install Vercel CLI**

   ```bash
   npm i -g vercel
   ```

2. **Deploy**

   ```bash
   vercel --prod
   ```

3. **Set environment variables** via Vercel Dashboard or CLI

## 🔧 Environment Variables

| Variable                | Required | Description                           |
| ----------------------- | -------- | ------------------------------------- |
| `NODE_ENV`              | Yes      | `development` or `production`         |
| `PORT`                  | No       | Server port (default: 5000)           |
| `MONGODB_URI`           | Yes      | MongoDB connection string             |
| `JWT_SECRET`            | Yes      | Secret for access tokens (32+ chars)  |
| `JWT_REFRESH_SECRET`    | Yes      | Secret for refresh tokens (32+ chars) |
| `CORS_ORIGIN`           | Yes      | Allowed frontend origin(s)            |
| `CLOUDINARY_CLOUD_NAME` | Yes\*    | Cloudinary cloud name                 |
| `CLOUDINARY_API_KEY`    | Yes\*    | Cloudinary API key                    |
| `CLOUDINARY_API_SECRET` | Yes\*    | Cloudinary API secret                 |

\*Required in production; optional in development (files saved locally)

## 📁 Project Structure

```
backend-express/
├── config/          # Configuration files (database, cloudinary)
├── controllers/     # Route controllers (business logic)
├── middleware/      # Custom middleware (auth, validation)
├── models/          # Mongoose models (schemas)
├── routes/          # API route definitions
├── scripts/         # Utility scripts (seeding, migration)
├── uploads/         # Local file uploads (dev only)
├── utils/           # Helper utilities
├── server.js        # Main entry point
├── vercel.json      # Vercel deployment config
└── package.json     # Dependencies and scripts
```

## 🛣️ API Endpoints

### Authentication

- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/me` - Get current user profile

### Tickets

- `GET /api/tickets` - List all tickets
- `GET /api/tickets/:id` - Get ticket by ID
- `POST /api/tickets` - Create new ticket
- `PUT /api/tickets/:id` - Update ticket
- `POST /api/tickets/:id/assign` - Assign ticket
- `POST /api/tickets/:id/acknowledge` - Acknowledge ticket
- `POST /api/tickets/:id/start` - Start work on ticket
- `POST /api/tickets/:id/resolve` - Resolve ticket
- `POST /api/tickets/:id/close` - Close ticket
- `POST /api/tickets/:id/reopen` - Reopen ticket
- `GET /api/tickets/dashboard/stats` - Get dashboard statistics

### Sites

- `GET /api/sites` - List all sites
- `POST /api/sites` - Create site
- `PUT /api/sites/:id` - Update site
- `DELETE /api/sites/:id` - Delete site

### Assets

- `GET /api/assets` - List all assets
- `POST /api/assets` - Create asset
- `POST /api/assets/import` - Bulk import assets
- `GET /api/assets/export` - Export assets to Excel

### Users

- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `GET /api/users/engineers` - Get list of engineers

### Activities

- `GET /api/tickets/:id/activities` - Get ticket activities
- `POST /api/tickets/:id/activities` - Add activity/comment
- `POST /api/tickets/:id/activities/attachments` - Upload attachment

See [API_DOCUMENTATION.md](./Docs/API.md) for full API reference.

## 🔌 Socket.io Events

### Client → Server

- `join` - Join user room for notifications
- `join:ticket` - Join specific ticket room
- `leave:ticket` - Leave ticket room

### Server → Client

- `ticket:created` - New ticket created
- `ticket:assigned` - Ticket assigned
- `activity:created` - New activity/comment added

## 🧪 Testing

```bash
# Run tests (once implemented)
npm test
```

## 📝 Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with initial data
- `npm run seed:full` - Seed database with comprehensive sample data
- `npm run migrate` - Migrate data from SQL Server (if applicable)

## 🐛 Troubleshooting

### MongoDB Connection Issues

**Error:** `MongoServerError: bad auth`

- **Solution:** Check username/password in `MONGODB_URI`

**Error:** `ECONNREFUSED`

- **Solution:** Check MongoDB is running or Atlas IP whitelist

### CORS Issues

**Error:** `Access-Control-Allow-Origin`

- **Solution:** Update `CORS_ORIGIN` to match frontend URL

### JWT Issues

**Error:** `JsonWebTokenError`

- **Solution:** Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` are set and are 32+ characters

## 🔒 Security

- Passwords hashed with bcrypt
- JWT authentication with refresh tokens
- Helmet for security headers
- CORS protection
- Input validation with express-validator
- MongoDB injection protection (Mongoose)

## 🚀 Performance

- Response compression enabled
- MongoDB indexes on frequently queried fields
- Connection pooling
- Efficient aggregation queries

## 📚 Dependencies

### Production

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **socket.io**: Real-time bidirectional communication
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **cloudinary**: Cloud file storage
- **multer**: File upload handling
- **cors**: Cross-origin resource sharing
- **helmet**: Security headers
- **compression**: Response compression

### Development

- **nodemon**: Auto-restart on file changes

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

ISC

## 🆘 Support

For deployment issues, see [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)

For API documentation, see [Docs/API.md](./Docs/API.md)
