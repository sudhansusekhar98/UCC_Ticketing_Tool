# UCC Ticketing Tool - Frontend

React + Vite application for the UCC Ticketing Tool.

## 🚀 Quick Start

### Local Development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   Create a `.env` file in this directory:

   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

   Or run the setup script from the root directory:

   ```bash
   # From project root
   setup-local.bat
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Open browser**
   - Navigate to `http://localhost:5173`

## 📦 Production Build

```bash
npm run build
```

The built files will be in the `dist` directory.

## 🌐 Deployment

### Environment Variables

**Required:**

- `VITE_API_URL` - Backend API URL (e.g., `https://api.yourdomain.com/api`)

### Vercel Deployment

1. **Set environment variable in Vercel Dashboard:**

   - Go to Project Settings > Environment Variables
   - Add `VITE_API_URL` with your production backend URL
   - Save and redeploy

2. **Or use Vercel CLI:**
   ```bash
   vercel env add VITE_API_URL production
   ```

### Important Notes

- All hardcoded `localhost:5000` references have been removed
- The app uses environment variables for all backend connections
- Make sure `VITE_API_URL` is set **before** building
- The URL should NOT include a trailing slash

## 🔧 Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Routing
- **Axios** - HTTP client
- **Socket.io Client** - Real-time updates
- **Zustand** - State management
- **React Hot Toast** - Notifications
- **Lucide React** - Icons
- **Date-fns** - Date formatting
- **Recharts** - Charts and visualizations

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## 🐛 Troubleshooting

### "Login Failed" Error in Production

**Cause:** Backend URL not configured correctly

**Solution:**

1. Verify `VITE_API_URL` is set in Vercel environment variables
2. Ensure the URL points to your deployed backend
3. Check backend CORS settings allow your frontend domain
4. Redeploy after setting environment variables

### Socket.io Connection Failed

**Cause:** WebSocket configuration issue

**Solution:**

1. Ensure `VITE_API_URL` is set correctly
2. Verify backend supports WebSocket connections
3. Check hosting platform allows WebSockets

### Images Not Loading

**Cause:** Cloudinary not configured or URL mismatch

**Solution:**

1. Verify backend Cloudinary credentials
2. Check attachment URLs in browser DevTools
3. Ensure `VITE_API_URL` doesn't have trailing slash

## 📚 Additional Documentation

See [DEPLOYMENT_GUIDE.md](../../DEPLOYMENT_GUIDE.md) in the project root for comprehensive deployment instructions.

## 🤝 Support

For issues or questions, check the main project documentation or deployment guide.
