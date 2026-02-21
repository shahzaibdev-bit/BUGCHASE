const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyAhv7Kuim2F_yiM3aVKPpUF-mOx0EuJ8kE");

async function testModels() {
  const models = ["gemini-2.0-flash", "gemini-2.0-flash-001", "gemini-1.5-flash-8b", "gemini-1.5-flash-latest"];
  
  for (const modelName of models) {
    console.log(`Testing: ${modelName}`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hello");
      console.log(`SUCCESS: ${modelName}`);
      console.log(result.response.text());
      return; 
    } catch (e) {
      console.log(`FAILED: ${modelName} - ${e.message.split('\n')[0]}`);
    }
  }
}

testModels();
