# 🚀 Vercel Backend Deployment Guide

## Prerequisites
- Node.js 18+ installed
- Vercel account created
- Vercel CLI installed

## Quick Deployment

### Method 1: Using Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Method 2: Using Deployment Script
```bash
# Make script executable
chmod +x deploy-vercel.sh

# Run deployment
./deploy-vercel.sh
```

### Method 3: GitHub Integration
1. Push code to GitHub
2. Connect repository to Vercel
3. Auto-deploy on push

## Environment Variables Setup

### Required Environment Variables in Vercel Dashboard:
```
NODE_ENV=production
SUPABASE_URL=https://fwbizsvzkwzfahvgnegr.supabase.co
SUPABASE_ANON_KEY=your-supabase-key
POSTGRES_URL=your-postgres-connection-string
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=https://escrow-account-ledger.web.app
```

## Configuration Files

### vercel.json
- Routes all requests to server.js
- Sets production environment
- Configures function timeout (30s)

### server.js
- Main backend server
- Handles all API routes
- CORS configured for Firebase frontend

## API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /api/health` - API health check

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Parties
- `GET /api/parties` - Get all parties
- `POST /api/parties` - Create new party

### Ledger
- `GET /api/ledger` - Get ledger entries
- `POST /api/ledger` - Create ledger entry

### Trial Balance
- `GET /api/trial-balance` - Get trial balance
- `POST /api/trial-balance/refresh` - Force refresh

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Check CORS_ORIGIN in environment variables
2. **Database Connection**: Verify Supabase credentials
3. **Function Timeout**: Check vercel.json maxDuration setting
4. **Environment Variables**: Ensure all required vars are set in Vercel dashboard

### Debug Commands:
```bash
# Check Vercel status
vercel ls

# View deployment logs
vercel logs

# Check environment variables
vercel env ls
```

## Performance Optimization

### Vercel Settings:
- Function timeout: 30 seconds
- Memory: Auto-allocated
- Region: Auto-selected (or specify in vercel.json)

### Database Optimization:
- Connection pooling enabled
- Query timeout: 10 seconds
- Cache TTL: 5 minutes

## Monitoring

### Vercel Analytics:
- Function execution time
- Error rates
- Request volume
- Performance metrics

### Health Checks:
- `/health` endpoint for uptime monitoring
- Database connection status
- API response time monitoring

## Support

For issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test database connectivity
4. Check CORS configuration
5. Review function timeout settings
