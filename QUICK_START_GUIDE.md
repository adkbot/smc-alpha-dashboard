# 🚀 Quick Start Guide - Vision Agent Integration

## Prerequisites

- Supabase account with project ID: `zfefnlibzgkfbgdtagho`
- Access to Supabase Dashboard: https://app.supabase.com

---

## ⚡ 5-Minute Setup

### Step 1: Apply Database Migrations (2 minutes)

1. Open https://app.supabase.com/project/zfefnlibzgkfbgdtagho/sql/new
2. Copy the content of this file: `supabase/migrations/20251125120000_create_vision_agent_tables.sql`
3. Paste it into the SQL Editor
4. Click **Run** or press `Ctrl+Enter`
5. Verify success: You should see "Success. No rows returned"

### Step 2: Deploy Edge Function (2 minutes)

1. Open https://app.supabase.com/project/zfefnlibzgkfbgdtagho/functions
2. Click **New Edge Function**
3. Function Name: `vision-agent-signal`
4. Copy the code from `supabase/functions/vision-agent-signal/index.ts`
5. Paste and click **Deploy**
6. Go to function settings and set `Verify JWT` to **OFF**

### Step 3: Test the Application (1 minute)

1. Open http://localhost:8080 in your browser
2. Click "Acessar Plataforma"
3. Login or register
4. Navigate to Dashboard - you should see the **Vision Agent Panel**
5. Click settings icon to configure Vision Agent

---

## ✅ Verification

After completing the steps above, run this verification:

### Test Database Tables

1. Go to Supabase Dashboard → Table Editor
2. You should see 3 new tables:
   - `vision_agent_videos`
   - `vision_agent_settings`
   - `vision_agent_signals`

### Test Edge Function

1. Go to Supabase Dashboard → Edge Functions
2. Click on `vision-agent-signal`
3. Test with this payload:

```json
{
  "user_id": "test-user-id",
  "action": "IGNORE",
  "confidence": 0.5,
  "asset": "BTCUSDT",
  "video_id": "test123"
}
```

4. Expected response:
```json
{
  "status": "ignored",
  "message": "Signal action is IGNORE"
}
```

---

## 🎯 What's Next?

### Configure Vision Agent in Dashboard

1. Login to the dashboard
2. Go to Vision Agent Settings page (click settings icon in Vision Agent Panel)
3. Configure:
   - **Enable Agent**: Toggle ON
   - **Mode**: Start with SHADOW (safe testing)
   - **Confidence Threshold**: 0.70 (default)
   - **YouTube URL**: Your trading video playlist/channel
   - **Max Signals Per Day**: 50 (default)

### Python Service Setup (Optional)

If you want to process YouTube videos:

```bash
cd vision-agent-service
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
python src/main.py --mode SHADOW --user-id YOUR_USER_ID
```

---

## 📊 Component Overview

### Vision Agent Panel (Dashboard)

Shows real-time status:
- 🟢 Active / 🔴 Inactive / ⏳ Processing
- Current mode (SHADOW/PAPER/LIVE)
- Signal counters (Total / Today / Executed)
- Video processing progress

### Vision Agent Settings Page

3 main tabs:
1. **General**: Enable/disable, mode, confidence threshold, signal limits
2. **YouTube**: Playlist URL, channel URL, auto-processing options
3. **Advanced**: Frame step, sequence length, video duration limits

Plus a **Video History** table showing all processed videos.

### Active Positions Panel

Now shows a **👁️ VA** badge on positions created by Vision Agent with confidence tooltip.

---

## 🔒 Security Notes

- All Vision Agent tables have **Row Level Security (RLS)** enabled
- Users can only access their own data
- Confidence thresholds prevent low-quality signals
- Daily signal limits prevent spam
- SHADOW mode allows testing without real trades

---

## 💡 Tips

1. **Start with SHADOW mode** to test the system without risk
2. **Set a high confidence threshold** (0.75+) initially
3. **Monitor the logs** in Supabase Dashboard → Logs
4. **Review signals** in the Vision Agent Settings → Video History tab
5. **Adjust thresholds** based on performance metrics

---

## ⚠️ Troubleshooting

**Q**: I don't see the Vision Agent Panel in Dashboard  
**A**: Ensure you're logged in and the migrations were applied successfully

**Q**: Edge Function returns "Vision Agent is not enabled"  
**A**: Go to Vision Agent Settings and toggle "Enable Agent" to ON

**Q**: Signals have low confidence  
**A**: Lower the confidence threshold in settings (but not below 0.60)

**Q**: No videos are being processed  
**A**: Make sure Python service is running and configured correctly

---

## 📚 Full Documentation

For detailed information, see:
- `DEPLOYMENT_STATUS.md` - Complete deployment guide
- `VISION_AGENT_INTEGRATION_ANALYSIS.md` - Technical analysis
- `DATABASE_SCHEMA_REFERENCE.md` - Database schema details
- `vision-agent-service/README.md` - Python service documentation

---

**Ready to trade smarter with Vision AI?** 🚀
