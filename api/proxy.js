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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.census.gov/'
        },
        timeout: 20000
      };
      
      const request = client.request(options, (response) => {
        let body = '';
        response.on('data', (chunk) => body += chunk);
        response.on('end', () => {
          // Check status code
          if (response.statusCode >= 400) {
            reject(new Error('HTTP ' + response.statusCode + ': ' + body.substring(0, 200)));
            return;
          }
          
          // Try to parse as JSON
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            // If it's HTML, extract any useful info
            if (body.includes('<!DOCTYPE') || body.includes('<html')) {
              reject(new Error('Service returned webpage instead of data (Status: ' + response.statusCode + ')'));
            } else {
              reject(new Error('Invalid response format. Body starts with: ' + body.substring(0, 100)));
            }
          }
        });
      });
      
      request.on('error', (err) => reject(new Error('Network error: ' + err.message)));
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timed out'));
      });
      request.end();
    });
    
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
