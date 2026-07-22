# Hollow Vault Quick Start — Vercel Deployment

## 30-Second Setup

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Hollow Vault ready for Vercel"
   git push origin main
   ```

2. **Import in Vercel**
   - Go to https://vercel.com/new
   - Select **Continue with GitHub** and authorize
   - Import this repository
   - Framework detection: ✅ **Next.js** (auto-detected)
   - **Build Command**: `next build`
   - **Install Command**: `pnpm install --frozen-lockfile`
   - **Output Directory**: (leave empty)

3. **Add Environment Variables** (optional for live AI)
   - Go to **Settings → Environment Variables**
   - Add `OPENAI_API_KEY` (your OpenAI project key)
   - Add `OPENAI_MODEL` = `gpt-5.0-mini` (or your preferred model)
   - **Apply to**: Production
   - Click **Deploy**

4. **Verify Deployment**
   ```bash
   curl https://YOUR_DOMAIN/api/health
   # Expected: { "status": "ok", "service": "hollow-vault", ... }
   ```

5. **Play the Game**
   - Open https://YOUR_DOMAIN
   - Click **ENTER THE VAULT**
   - Enjoy! 🎮

---

## Without OpenAI (Game Still Works!)

If you skip step 3, the game plays with **local room generation**. It's fully playable—no key needed.

---

## Environment Variables (Optional Reference)

| Variable | Default | Range | Purpose |
|----------|---------|-------|---------|
| `OPENAI_API_KEY` | (empty) | – | Server-only API key (optional) |
| `OPENAI_MODEL` | `gpt-5.0-mini` | any OpenAI model | AI planning model |
| `ADAPTIVE_ROOMS_MAX_CALLS_PER_SESSION` | 4 | 1–12 | Daily room planning requests |
| `ADAPTIVE_ROOMS_TIMEOUT_MS` | 5000 | 1500–8000 | API timeout (ms) |
| `ADAPTIVE_ROOMS_COOLDOWN_MS` | 10000 | 0–120000 | Minimum interval between requests |
| `ADAPTIVE_ROOMS_CACHE_TTL_MS` | 21600000 | 60000–86400000 | Cache lifetime (6 hours default) |
| `ADAPTIVE_REINFORCEMENTS_MAX_CALLS_PER_SESSION` | 3 | 1–12 | Daily reinforcement requests |
| `ADAPTIVE_REINFORCEMENTS_COOLDOWN_MS` | 15000 | 0–120000 | Minimum interval |

---

## Troubleshooting

### Game Loads But No Menu
- Check browser console (F12) for errors
- Verify `.css` files loaded (Network tab)
- Try hard refresh (Ctrl+Shift+R)

### `/api/health` Returns 503
- Check that all API routes exist (`/api/health`, `/api/adaptive-rooms`, etc.)
- Verify Node.js runtime is enabled (should be auto-detected)

### Rooms Load Slowly / Timeouts
- If OpenAI key is set: check OpenAI project billing and rate limits
- Game automatically falls back to local rooms if OpenAI times out
- Increase `ADAPTIVE_ROOMS_TIMEOUT_MS` if needed (default: 5000ms)

### 429 Errors (Rate Limited)
- Player is requesting too many rooms too quickly
- Wait 10 seconds (configurable via `ADAPTIVE_ROOMS_COOLDOWN_MS`)
- Or start a new session

---

## Files to Know

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main game component (Canvas renderer + UI) |
| `app/api/health/route.ts` | Service status endpoint |
| `app/api/adaptive-rooms/route.ts` | AI room generation |
| `app/api/adaptive-reinforcements/route.ts` | AI reinforcement suggestions |
| `lib/server/openai/client.ts` | OpenAI SDK initialization (server-only) |
| `game/rooms.ts` | Room templates and presets |
| `game/adaptive.ts` | Player skill profiling |
| `.env.example` | Environment variable template |
| `DEPLOYMENT_HANDOFF.md` | Full deployment guide |
| `README.md` | Game mechanics overview |

---

## Performance Notes

- **First Build**: ~30 seconds
- **First Deployment**: ~2–3 minutes
- **Cold Start (first request)**: 2–5 seconds
- **Warm Requests**: <500ms
- **Game Framerate**: 60 FPS (Canvas rendering on client)

---

## Cost Estimate (with OpenAI)

- **Per Session**: ~$0.001–0.01 (depends on model and planning calls)
- **Monthly (1000 players)**: ~$1–100
- **Set a budget** in OpenAI org settings to avoid surprises

---

## Next Steps

1. Confirm build passes: `pnpm build`
2. Test locally: `pnpm dev` → http://localhost:3000
3. Push to GitHub
4. Deploy via Vercel
5. Share the link! 🚀

For detailed deployment info, see **DEPLOYMENT_HANDOFF.md**.
