const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

const genAI = new GoogleGenerativeAI("AIzaSyAhv7Kuim2F_yiM3aVKPpUF-mOx0EuJ8kE");

async function listModels() {
  const logStream = fs.createWriteStream('test-output.txt');
  const log = (msg) => {
      console.log(msg);
      logStream.write(msg + '\n');
  };

  try {
    const modelsToTry = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-pro", 
        "gemini-1.0-pro",
        "gemini-pro-vision"
    ];
    
    for (const modelName of modelsToTry) {
        log(`Trying model: ${modelName}`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Test");
            log(`SUCCESS: ${modelName}`);
            log(JSON.stringify(result, null, 2));
            return; // Exit on first success
        } catch (error) {
            log(`FAILED: ${modelName}`);
            log(`Error Message: ${error.message}`);
        }
    }
    log("All models failed.");

  } catch (error) {
    log("Script Error: " + error.message);
  }
}

listModels();
