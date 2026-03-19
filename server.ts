import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'test';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'test';
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal token request failed: ${response.status} ${text}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  const getRedirectUri = (req: express.Request) => {
    // Always use the APP_URL environment variable to get the URL of the container
    let baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    const finalUri = `${baseUrl}/api/auth/pinterest/callback`;
    console.log("Generated Redirect URI:", finalUri);
    return finalUri;
  };

  // Payment Endpoints
  app.post('/api/create-subscription', async (req, res) => {
    try {
      const { userId } = req.body;
      let baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }

      const accessToken = await getPayPalAccessToken();

      const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              custom_id: userId,
              amount: {
                currency_code: 'USD',
                value: '1.00',
              },
              description: 'Pro Plan - 1 Month',
            },
          ],
          application_context: {
            return_url: `${baseUrl}/success`,
            cancel_url: `${baseUrl}/auth?plan=pro`,
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to create PayPal order: ${response.status} ${text}`);
      }

      const order = await response.json();
      if (order.id) {
        const approveLink = order.links.find((link: any) => link.rel === 'approve');
        res.json({ id: order.id, url: approveLink.href });
      } else {
        throw new Error(order.message || 'Failed to create PayPal order');
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/capture-subscription', async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(400).json({ error: 'Missing token' });
      }

      const accessToken = await getPayPalAccessToken();

      const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${token as string}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to capture PayPal order: ${response.status} ${text}`);
      }

      const captureData = await response.json();

      if (captureData.status === 'COMPLETED') {
        const userId = captureData.purchase_units[0].custom_id;
        res.json({ success: true, userId });
      } else {
        res.json({ success: false });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Routes
  app.get("/api/auth/pinterest/url", (req, res) => {
    const clientId = process.env.PINTEREST_APP_ID || "1550825";
    const redirectUri = getRedirectUri(req);
    
    const url = `https://www.pinterest.com/oauth/?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=pins:read,pins:write,boards:read,boards:write,user_accounts:read`;

    res.json({ url });
  });

  app.get("/api/auth/pinterest/callback", async (req, res) => {
    const { code } = req.query;
    const clientId = process.env.PINTEREST_APP_ID || "1550825";
    const clientSecret = process.env.PINTEREST_APP_SECRET || "9586e373e34a3bbcf4d873c348b0eb13a701bf4b";
    const redirectUri = getRedirectUri(req);

    if (!code) {
      res.status(400).send("No authorization code provided.");
      return;
    }

    try {
      // Exchange code for token
      const baseUrl = process.env.PINTEREST_USE_SANDBOX === 'false' 
        ? 'https://api.pinterest.com/v5' 
        : 'https://api-sandbox.pinterest.com/v5'; // Defaulting to sandbox
      
      const tokenResponse = await fetch(`${baseUrl}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: redirectUri
        })
      });

      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errText}`);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Send success message to parent window and close popup
      res.send(`
        <html>
          <body>
            <script>
              try {
                // 1. Try localStorage (most reliable across same-origin popups)
                localStorage.setItem('pinterest_auth_token', '${accessToken}');
                localStorage.setItem('pinterest_auth_time', Date.now().toString());
                
                // 2. Try window.opener.postMessage
                if (window.opener) {
                  window.opener.postMessage({ type: 'PINTEREST_AUTH_SUCCESS', token: '${accessToken}' }, '*');
                }
              } catch (e) {
                console.error("Error communicating with opener:", e);
              }
              
              // Attempt to close immediately
              window.close();
              
              // Fallback to close after a short delay
              setTimeout(function() {
                window.close();
              }, 500);
              
              // If it's still open, redirect to the app with the token in the URL
              setTimeout(function() {
                window.location.href = '/app?pinterest_token=${accessToken}';
              }, 1000);
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("OAuth Callback Error:", error);
      res.status(500).send("Authentication failed. Please close this window and try again.");
    }
  });

  app.all('/api/pinterest/*', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
      res.status(401).json({ error: 'No authorization header' });
      return;
    }

    const targetPath = req.url.replace('/api/pinterest', '');
    
    // Try sandbox first (as requested), then fallback to production
    const isSandboxRequested = process.env.PINTEREST_USE_SANDBOX !== 'false';
    const primaryBaseUrl = isSandboxRequested ? 'https://api-sandbox.pinterest.com/v5' : 'https://api.pinterest.com/v5';
    const secondaryBaseUrl = isSandboxRequested ? 'https://api.pinterest.com/v5' : 'https://api-sandbox.pinterest.com/v5';
    
    const makeRequest = async (baseUrl: string) => {
      const targetUrl = `${baseUrl}${targetPath}`;
      const options: RequestInit = {
        method: req.method,
        headers: {
          'Authorization': token,
          'User-Agent': 'PinterestPinCreator/1.0',
          'Accept': 'application/json',
        },
      };

      if (req.headers['content-type']) {
        (options.headers as Record<string, string>)['Content-Type'] = req.headers['content-type'];
      } else if (req.method !== 'GET' && req.method !== 'HEAD') {
        (options.headers as Record<string, string>)['Content-Type'] = 'application/json';
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        options.body = JSON.stringify(req.body);
      }

      return fetch(targetUrl, options);
    };

    try {
      let response = await makeRequest(primaryBaseUrl);
      
      // If authentication fails or forbidden, the token might be for the other environment
      if (response.status === 401 || response.status === 403) {
        const fallbackResponse = await makeRequest(secondaryBaseUrl);
        if (fallbackResponse.ok || (fallbackResponse.status !== 401 && fallbackResponse.status !== 403)) {
          response = fallbackResponse;
        }
      }

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        data = { message: text || 'Unknown error' };
      }
      
      res.status(response.status).json(data);
    } catch (error) {
      console.error('Pinterest API Proxy Error:', error);
      res.status(500).json({ error: 'Proxy request failed', details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
