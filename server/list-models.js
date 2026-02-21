const https = require('https');
const fs = require('fs');

const API_KEY = "AIzaSyAhv7Kuim2F_yiM3aVKPpUF-mOx0EuJ8kE";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
        const json = JSON.parse(data);
        fs.writeFileSync('models-full.json', JSON.stringify(json, null, 2));
        console.log("Written to models-full.json");
    } catch (e) {
        console.log("Error parsing JSON:", e.message);
    }
  });

}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
