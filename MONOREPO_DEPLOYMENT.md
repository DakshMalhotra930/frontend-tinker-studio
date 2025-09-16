# 🚀 Monorepo Deployment Guide for PraxisAI

Since both frontend and backend are in the same repository, here's how to deploy them separately:

## 📱 **FRONTEND DEPLOYMENT TO VERCEL**

### **Method 1: Vercel Dashboard (Recommended)**

1. **Go to [vercel.com](https://vercel.com)**
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure the project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend-tinker-studio` ⚠️ **IMPORTANT**
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. **Add Environment Variables**:
   - Go to Settings → Environment Variables
   - Add: `VITE_API_BASE_URL` = `https://praxis-ai.fly.dev`

### **Method 2: Vercel CLI**

```bash
# Navigate to frontend directory
cd frontend-tinker-studio

# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# When prompted:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - What's your project's name? praxis-ai-frontend
# - In which directory is your code located? ./
# - Want to override settings? No
```

---

## 🖥️ **BACKEND DEPLOYMENT TO FLY.IO**

### **Step 1: Install Fly CLI**

```powershell
# Windows PowerShell
iwr https://fly.io/install.ps1 -useb | iex
```

### **Step 2: Login to Fly.io**

```bash
fly auth login
```

### **Step 3: Deploy Backend**

```bash
# Navigate to backend directory
cd backend

# Deploy (this will use your existing fly.toml)
fly deploy
```

### **Step 4: Set Environment Variables**

```bash
# Set your secrets
fly secrets set TOGETHER_API_KEY="your-together-ai-key"
fly secrets set DB_HOST="your-database-host"
fly secrets set DB_USER="your-database-user"
fly secrets set DB_PASSWORD="your-database-password"
fly secrets set DB_NAME="your-database-name"
fly secrets set DB_PORT="5432"
fly secrets set GOOGLE_GEMINI_API_KEY="your-gemini-key"

# Optional payment secrets
fly secrets set RAZORPAY_KEY_ID="your-razorpay-key"
fly secrets set RAZORPAY_KEY_SECRET="your-razorpay-secret"
fly secrets set UPI_ID="praxisai@paytm"
fly secrets set MERCHANT_NAME="PraxisAI"
```

---

## 🗄️ **DATABASE SETUP**

### **Step 1: Set up Supabase**

1. **Create Supabase project** at [supabase.com](https://supabase.com)
2. **Get your database credentials**:
   - Host: `db.your-project-id.supabase.co`
   - User: `postgres`
   - Password: Your database password
   - Database: `postgres`
   - Port: `5432`

### **Step 2: Run Database Schema**

1. **Go to Supabase Dashboard → SQL Editor**
2. **Copy and paste** the contents of `supabase_credit_system.sql`
3. **Click "Run"** to execute

### **Step 3: Verify Tables**

Check that these tables are created:
- `daily_credits`
- `credit_usage_logs`
- `pro_subscriptions`
- `payment_transactions`
- `pro_features`

---

## 🔧 **QUICK DEPLOYMENT SCRIPT**

I've created a PowerShell script to help you deploy both services. Run this from your project root:

```powershell
# Make sure you're in the project root directory
.\deploy.ps1
```

The script will guide you through:
1. Deploying frontend to Vercel
2. Deploying backend to Fly.io
3. Setting up environment variables

---

## 📋 **DEPLOYMENT CHECKLIST**

### **Before Deployment**
- [ ] Database set up and schema deployed
- [ ] Environment variables ready
- [ ] Both services build successfully locally

### **Frontend (Vercel)**
- [ ] Vercel account created
- [ ] GitHub repository connected
- [ ] Root directory set to `frontend-tinker-studio`
- [ ] Environment variables added
- [ ] Deployment successful

### **Backend (Fly.io)**
- [ ] Fly.io account created
- [ ] Fly CLI installed and logged in
- [ ] App created (or existing app used)
- [ ] Secrets set
- [ ] Deployment successful

### **Post-Deployment**
- [ ] Frontend can connect to backend
- [ ] Credit system working
- [ ] Payment flow functional
- [ ] Pro upgrade working

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues**

1. **Vercel can't find frontend**:
   - Make sure Root Directory is set to `frontend-tinker-studio`
   - Check that `package.json` exists in that directory

2. **Fly.io deployment fails**:
   - Check that you're in the `backend` directory
   - Verify `fly.toml` exists
   - Check `requirements.txt` has all dependencies

3. **CORS errors**:
   - Update `origins` in `backend/main.py` with your Vercel URL
   - Redeploy backend

4. **Database connection fails**:
   - Verify database credentials
   - Check if database is accessible from Fly.io
   - Ensure firewall allows connections

### **Debug Commands**

```bash
# Check Fly.io status
fly status

# View Fly.io logs
fly logs

# Check Vercel deployment
vercel logs

# Test backend health
curl https://your-app.fly.dev/health
```

---

## 🎉 **SUCCESS!**

Once deployed:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-app.fly.dev`
- **Users can**: Get 5 free credits daily, use Pro features, upgrade with QR payment

**Your PraxisAI Pro Mode system is now live! 🚀**

