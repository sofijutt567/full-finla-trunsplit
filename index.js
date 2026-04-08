import express from 'express';

const app = express();

// 1. JSON body parser
app.use(express.json());

// 2. CORS Setup
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST,GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// 3. Ping Route (Vercel par check karne ke liye)
app.get('/api/ping', (req, res) => {
    res.status(200).send('Vercel Backend is Live!');
});

// 4. API Route for Turnstile Verification
app.post('/api/verify-turnstile', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ success: false, error: 'Captcha token is missing' });
    }

    const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

    if (!SECRET_KEY) {
        return res.status(500).json({ success: false, error: 'Server Environment Variable Missing' });
    }

    try {
        const formData = new URLSearchParams();
        formData.append('secret', SECRET_KEY);
        formData.append('response', token);

        const cfResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const data = await cfResponse.json();

        if (data.success) {
            return res.status(200).json({ success: true, message: 'Verified' });
        } else {
            return res.status(400).json({ success: false, error: 'Verification failed', details: data['error-codes'] });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// Vercel ke liye export lazmi hai
export default app;
