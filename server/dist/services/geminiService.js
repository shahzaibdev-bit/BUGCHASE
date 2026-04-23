"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReportSummary = void 0;
const generative_ai_1 = require("@google/generative-ai");
const API_KEY = "AIzaSyAhv7Kuim2F_yiM3aVKPpUF-mOx0EuJ8kE"; // Ideally move to process.env.GEMINI_API_KEY
const genAI = new generative_ai_1.GoogleGenerativeAI(API_KEY);
const generateReportSummary = async (report, timeline) => {
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });
        // Filter relevant timeline events (comments, status changes)
        const relevantEvents = timeline.map(e => ({
            author: e.sender?.name || e.author || 'System',
            role: e.sender?.role || e.role,
            content: e.content,
            timestamp: e.createdAt || e.timestamp
        }));
        const prompt = `
        You are a professional security analyst. Your task is to generate an executive summary for a vulnerability report that is being promoted to "Triaged" (validated).
        This summary will be sent to the company's security team.

        **Report Details:**
        - Title: ${report.title}
        - Type: ${report.type}
        - Asset: ${report.asset}
        - Description: ${report.description}
        - Steps to Reproduce: ${report.stepsToReproduce}

        **Communication History:**
        ${JSON.stringify(relevantEvents, null, 2)}

        **Instructions:**
        1. Analyze the report and the communication history.
        2. Generate a professional summary in JSON format with the following fields:
           - "title": A concise, professional title for the issue (refine if necessary).
           - "technical_summary": A detailed technical explanation of the vulnerability, its impact, and how it was validated. Use **Bold** for key concepts and bullet points for lists. Format as Markdown.
           - "remediation": Clear, actionable steps to remediate the vulnerability. Use numbered lists and code blocks if applicable. Format as Markdown.

        **Output Format (JSON):**
        {
            "title": "...",
            "technical_summary": "...",
            "remediation": "..."
        }
        `;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // console.log("Gemini Raw Output:", text);
        return JSON.parse(text);
    }
    catch (error) {
        console.error("Gemini Generation Error:", error);
        throw new Error(`Failed to generate AI summary: ${error.message}`);
    }
};
exports.generateReportSummary = generateReportSummary;
