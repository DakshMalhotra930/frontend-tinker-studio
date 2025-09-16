# 🚀 PraxisAI Deployment Guide

## 📱 **FRONTEND DEPLOYMENT TO VERCEL**

### **Step 1: Prepare for Vercel**

1. **Install Vercel CLI** (if not already installed):
```bash
npm i -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Navigate to frontend directory**:
```bash
cd frontend-tinker-studio
```

### **Step 2: Deploy to Vercel**

1. **Initialize Vercel project**:
```bash
vercel
```

2. **Follow the prompts**:
   - Set up and deploy? **Yes**
   - Which scope? **Your account**
   - Link to existing project? **No**
   - What's your project's name? **praxis-ai-frontend**
   - In which directory is your code located? **./** (current directory)
   - Want to override settings? **No**

3. **Set Environment Variables** in Vercel Dashboard:
   - Go to your project dashboard
   - Navigate to Settings → Environment Variables
   - Add these variables:

```
VITE_API_BASE_URL = https://praxis-ai.fly.dev
VITE_SUPABASE_URL = your-supabase-url
VITE_SUPABASE_ANON_KEY = your-supabase-anon-key
```

4. **Redeploy** after adding environment variables:
```bash
vercel --prod
```

### **Step 3: Configure Custom Domain (Optional)**
- Go to Vercel Dashboard → Domains
- Add your custom domain
- Update DNS records as instructed

---

## 🖥️ **BACKEND DEPLOYMENT TO FLY.IO**

### **Step 1: Install Fly CLI**

1. **Download Fly CLI**:
   - Windows: Download from https://fly.io/docs/hands-on/install-flyctl/
   - Or use PowerShell:
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

2. **Login to Fly.io**:
```bash
fly auth login
```

### **Step 2: Prepare Backend for Deployment**

1. **Navigate to backend directory**:
```bash
cd backend
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Add new dependencies for credit system**:
```bash
pip install qrcode[pil]
```

4. **Update requirements.txt**:
```bash
pip freeze > requirements.txt
```

### **Step 3: Configure Fly.io**

1. **Initialize Fly.io app** (if not already done):
```bash
fly launch
```

2. **Follow the prompts**:
   - App name: **praxis-ai** (or your preferred name)
   - Region: **bom** (Mumbai) or **sin** (Singapore) for India
   - Deploy now? **No** (we'll configure first)

3. **Update fly.toml** with proper configuration:
```toml
app = "praxis-ai"
primary_region = "bom"

[build]

[env]
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

### **Step 4: Set Environment Variables**

1. **Set secrets in Fly.io**:
```bash
fly secrets set TOGETHER_API_KEY="your-together-ai-key"
fly secrets set DB_HOST="your-database-host"
fly secrets set DB_USER="your-database-user"
fly secrets set DB_PASSWORD="your-database-password"
fly secrets set DB_NAME="your-database-name"
fly secrets set DB_PORT="5432"
fly secrets set GOOGLE_GEMINI_API_KEY="your-gemini-key"
```

2. **Optional payment secrets**:
```bash
fly secrets set RAZORPAY_KEY_ID="your-razorpay-key"
fly secrets set RAZORPAY_KEY_SECRET="your-razorpay-secret"
fly secrets set UPI_ID="praxisai@paytm"
fly secrets set MERCHANT_NAME="PraxisAI"
```

### **Step 5: Deploy Backend**

1. **Deploy to Fly.io**:
```bash
fly deploy
```

2. **Check deployment status**:
```bash
fly status
```

3. **View logs**:
```bash
fly logs
```

4. **Open your app**:
```bash
fly open
```

---

## 🗄️ **DATABASE SETUP**

### **Step 1: Set up Supabase/PostgreSQL**

1. **Create Supabase project**:
   - Go to https://supabase.com
   - Create new project
   - Note down your database credentials

2. **Run the credit system schema**:
   - Go to Supabase Dashboard → SQL Editor
   - Copy and paste the contents of `supabase_credit_system.sql`
   - Click "Run" to execute

3. **Verify tables are created**:
   - Check Table Editor for these tables:
     - `daily_credits`
     - `credit_usage_logs`
     - `pro_subscriptions`
     - `payment_transactions`
     - `pro_features`

### **Step 2: Update Environment Variables**

Update both Vercel and Fly.io with your database credentials:
- `DB_HOST` = your-supabase-host
- `DB_USER` = postgres
- `DB_PASSWORD` = your-supabase-password
- `DB_NAME` = postgres
- `DB_PORT` = 5432

---

## 🔧 **POST-DEPLOYMENT CONFIGURATION**

### **Step 1: Update CORS Settings**

1. **Update backend CORS** in `backend/main.py`:
```python
origins = [
    "https://your-vercel-app.vercel.app",  # Your Vercel URL
    "https://praxis-ai.fly.dev",
    "http://localhost:8080",
    "http://localhost:5173",
    "http://localhost:3000",
]
```

2. **Redeploy backend**:
```bash
fly deploy
```

### **Step 2: Test the Complete Flow**

1. **Test frontend**:
   - Visit your Vercel URL
   - Check if credit display works
   - Test login functionality

2. **Test backend**:
   - Visit `https://your-app.fly.dev/health`
   - Check if all endpoints respond

3. **Test payment flow**:
   - Try to use a Pro feature
   - Check if upgrade prompt appears
   - Test payment modal (don't complete payment)

### **Step 3: Set up Payment Webhooks**

1. **Configure webhook URL** in your payment provider:
   - Webhook URL: `https://your-app.fly.dev/api/webhook/payment`
   - Events: Payment completed, Payment failed

2. **Test webhook**:
   - Make a test payment
   - Verify user gets upgraded to Pro

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues**

1. **Build fails on Vercel**:
   - Check environment variables are set
   - Ensure all dependencies are in package.json
   - Check build logs in Vercel dashboard

2. **Backend deployment fails**:
   - Check fly.toml configuration
   - Verify all secrets are set
   - Check fly logs for errors

3. **Database connection fails**:
   - Verify database credentials
   - Check if database is accessible from Fly.io
   - Ensure firewall allows connections

4. **CORS errors**:
   - Update origins list in backend
   - Redeploy backend
   - Clear browser cache

### **Debug Commands**

```bash
# Check Fly.io status
fly status

# View Fly.io logs
fly logs

# SSH into Fly.io machine
fly ssh console

# Check Vercel deployment
vercel logs

# Check environment variables
vercel env ls
```

---

## ✅ **DEPLOYMENT CHECKLIST**

### **Frontend (Vercel)**
- [ ] Vercel CLI installed and logged in
- [ ] Project deployed successfully
- [ ] Environment variables set
- [ ] Custom domain configured (optional)
- [ ] Build passes without errors

### **Backend (Fly.io)**
- [ ] Fly CLI installed and logged in
- [ ] App created and configured
- [ ] Environment variables/secrets set
- [ ] Database schema deployed
- [ ] App deployed successfully
- [ ] Health check passes

### **Database**
- [ ] Supabase/PostgreSQL set up
- [ ] Credit system schema deployed
- [ ] Tables created successfully
- [ ] Sample data inserted (optional)

### **Integration**
- [ ] CORS configured correctly
- [ ] Frontend can connect to backend
- [ ] Credit system working
- [ ] Payment flow functional
- [ ] Pro upgrade working

---

## 🎉 **SUCCESS!**

Once everything is deployed and working:

1. **Your frontend** will be available at: `https://your-app.vercel.app`
2. **Your backend** will be available at: `https://your-app.fly.dev`
3. **Users can**:
   - Get 5 free credits daily
   - Use Pro features with credits
   - Upgrade to Pro with QR payment
   - Enjoy unlimited Pro access

**Congratulations! Your PraxisAI Pro Mode system is now live! 🚀**

