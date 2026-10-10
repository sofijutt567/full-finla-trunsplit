import express from 'express';
const app = express();

app.use(express.json());

// CORS Setup
// Login page aur Apply Assist page (healthjobportal.com/apply) dono isi endpoint ko call karte hain.
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
});

// Optional: Vercel env var ALLOWED_HOSTNAMES = healthjobportal.com,www.healthjobportal.com
// Agar set ho to sirf in hostnames par solve hue tokens manzoor honge.
// Set na ho to koi hostname check nahi hota (pehle jaisa behavior).
const ALLOWED_HOSTNAMES = (process.env.ALLOWED_HOSTNAMES || '')
    .split(',')
    .map(h => h.trim().toLowerCase())
    .filter(Boolean);

// Route
app.post('/api/verify-turnstile', async (req, res) => {
    const token = req.body && req.body.token;
    const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

    if (!SECRET_KEY) {
        return res.status(500).json({ success: false, error: 'server-misconfigured' });
    }
    if (!token || typeof token !== 'string' || token.length > 2048) {
        return res.status(400).json({ success: false, error: 'missing-token' });
    }

    try {
        const formData = new URLSearchParams();
        formData.append('secret', SECRET_KEY);
        formData.append('response', token);

        // User ki IP bhi Cloudflare ko bhejte hain (extra security)
        const fwd = req.headers['x-forwarded-for'];
        const ip = (typeof fwd === 'string' ? fwd.split(',')[0].trim() : '') || '';
        if (ip) formData.append('remoteip', ip);

        const cfResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });

        const data = await cfResponse.json();

        if (data.success && ALLOWED_HOSTNAMES.length) {
            const host = String(data.hostname || '').toLowerCase();
            if (!ALLOWED_HOSTNAMES.includes(host)) {
                return res.status(403).json({ success: false, error: 'hostname-not-allowed' });
            }
        }

        // Sirf zaroori cheezein wapas bhejte hain
        res.json({
            success: !!data.success,
            hostname: data.hostname,
            'error-codes': data['error-codes'] || []
        });
    } catch (e) {
        res.status(500).json({ success: false, error: 'verification-failed' });
    }
});

export default app; // Vercel ke liye lazmi hai
