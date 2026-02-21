const https = require('https');

const API_KEY = "AIzaSyAhv7Kuim2F_yiM3aVKPpUF-mOx0EuJ8kE";
const MODEL_NAME = "gemini-1.5-flash"; // Try standard one first
// const MODEL_NAME = "gemini-2.0-flash-exp";

const data = JSON.stringify({
  contents: [{
    parts: [{
      text: "Explain how AI works"
    }]
  }]
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseBody = '';

  res.on('data', (chunk) => {
    responseBody += chunk;
  });

  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Response Body:', responseBody);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
