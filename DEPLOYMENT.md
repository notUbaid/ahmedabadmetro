# Deployment Guide - AhmMetro Navigator

## Vercel Deployment

### Prerequisites
1. Get an OpenRouteService (ORS) API Key
   - Visit: https://openrouteservice.org/dev/#/signup
   - Sign up for a free account
   - Create a new token for the API
   - Copy the API key

### Setup Instructions

#### 1. Local Development
Create a `.env.local` file in the project root:
```
VITE_ORS_API_KEY=your_actual_api_key_here
```

This file is in `.gitignore` and won't be committed to Git.

#### 2. Vercel Deployment

**IMPORTANT**: You MUST set the environment variable in Vercel for the walking routes to work on the deployed site.

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: "ahmedabadmetro"
3. Click on "Settings" → "Environment Variables"
4. Add a new environment variable:
   - **Name**: `ORS_API_KEY`
   - **Value**: Your OpenRouteService API key
   - **Environments**: Select "Production" and "Preview"
5. Click "Save"
6. Trigger a redeploy:
   - Go to "Deployments"
   - Click the three dots on the latest deployment
   - Select "Redeploy"

### Why Two Different Names?

- **Client-side** (`VITE_ORS_API_KEY`): Used in the browser for warnings/information
- **Server-side** (`ORS_API_KEY`): Used in the Vercel serverless function `/api/walking-route.ts` to fetch actual walking routes

The API proxy on the server side uses `ORS_API_KEY` to securely call OpenRouteService without exposing the key to the browser.

### Troubleshooting

#### Walking routes show as straight lines
1. Check if `ORS_API_KEY` is set in Vercel Environment Variables
2. Verify the API key is correct and active
3. Check Vercel function logs:
   - Go to Deployments > Select deployment > Runtime Logs
   - Look for errors in the `/api/walking-route` logs
4. Redeploy the project after setting the environment variable

#### API Key is invalid
1. Log in to https://openrouteservice.org
2. Go to your profile/dashboard
3. Verify your API token is active
4. If expired or invalid, create a new token
5. Update the `ORS_API_KEY` in Vercel

### Testing

Once deployed, you should see:
- ✅ Actual walking path (not a straight line) between user location and nearest station
- ✅ Accurate walking distance and time estimates
- ✅ Smooth curved paths that follow streets

If you only see a straight line, the API key is likely not configured correctly.

### Budget Considerations

OpenRouteService free tier includes:
- 2,500 requests per day
- Sufficient for a small-medium user base
- Monitor usage in your ORS account dashboard

If you exceed limits, consider:
- Upgrading to a paid plan
- Implementing request caching
- Using a different routing service
