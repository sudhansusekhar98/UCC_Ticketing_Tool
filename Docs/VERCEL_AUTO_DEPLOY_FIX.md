# Vercel Auto-Deployment Fix

User reported that auto-deployment on push to GitHub is not working, even though manual redeployments work.

## Potential Causes & Solutions

### 1. Root Directory Setting (Most Likely)
Since your project is a monorepo with `frontend` and `backend-express` subdirectories, Vercel needs to know which folder to use.

**Fix:**
- Go to your Vercel Project Settings.
- Under **General** > **Root Directory**, enter `frontend` (for your frontend project) or `backend-express` (for your backend project).
- Save and redeploy.

### 2. GitHub Integration Link
Sometimes the webhook between GitHub and Vercel breaks.

**Fix:**
- Go to your Vercel Project Settings.
- Under **Git**, check if the repository `sudhansusekhar98/UCC_Ticketing_Tool` is correctly connected.
- Ensure the **Production Branch** is set to `main`.
- Try disconnecting and reconnecting the repository if it still doesn't trigger on push.

### 3. Vercel Ignored Build Step
Check if there is a setting that ignores certain commits (e.g., those with `[skip ci]`).

### 4. Monorepo Configuration
I have added a `package.json` at the root of the repository to help Vercel auto-detect the workspaces:
```json
{
  "name": "ticketops-monorepo",
  "private": true,
  "workspaces": [
    "frontend",
    "backend-express"
  ]
}
```

## How to Test
1. Commit these changes.
2. Push to the `main` branch of your GitHub repository.
3. Check the **Deployments** tab in Vercel to see if a new build starts automatically.
4. If it doesn't start, check the **Integration settings** for GitHub in Vercel.
