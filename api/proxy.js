export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const https = require('https');
    const http = require('http');
    
    const data = await new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.census.gov/'
        },
        timeout: 15000
      };
      
      const request = client.request(options, (response) => {
        let body = '';
        response.on('data', (chunk) => body += chunk);
        response.on('end', () => {
          // Check if response is HTML (error page)
          if (body.trim().startsWith('<!DOCTYPE') || body.trim().startsWith('<html')) {
            reject(new Error('Census API returned HTML instead of JSON. Status: ' + response.statusCode));
            return;
          }
          
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            // Return the raw body so we can debug
            reject(new Error('Parse error. Status: ' + response.statusCode + '. Body preview: ' + body.substring(0, 300)));
          }
        });
      });
      
      request.on('error', (err) => reject(new Error('Network error: ' + err.message)));
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
      request.end();
    });
    
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
