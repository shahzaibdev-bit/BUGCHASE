"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReportMessage = exports.suggestBountyAmount = exports.generateReportSummary = void 0;
const generative_ai_1 = require("@google/generative-ai");
const API_KEY = "AIzaSyAhv7Kuim2F_yiM3aVKPpUF-mOx0EuJ8kE"; // Ideally move to process.env.GEMINI_API_KEY
const genAI = new generative_ai_1.GoogleGenerativeAI(API_KEY);
const generateWithRetry = async (model, prompt, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await model.generateContent(prompt);
        }
        catch (error) {
            const is503 = error.status === 503 || (error.message && error.message.includes('503'));
            if (i === retries - 1 || !is503) {
                throw error;
            }
            console.log(`Gemini API 503 error. Retrying in ${delay}ms... (Attempt ${i + 1} of ${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
};
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
        const result = await generateWithRetry(model, prompt);
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
const suggestBountyAmount = async (report, timeline, rewardRange) => {
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });
        const relevantEvents = timeline.map(e => ({
            author: e.sender?.name || e.author || 'System',
            role: e.sender?.role || e.role,
            content: e.content,
            type: e.type,
            timestamp: e.createdAt || e.timestamp
        }));
        const prompt = `
        You are a Bug Bounty Program Manager determining the final reward payout for a vulnerability report.
        
        **Program Constraints for this Severity (${report.severity}):**
        - Minimum Reward: PKR ${rewardRange.min}
        - Maximum Reward: PKR ${rewardRange.max}
        
        **Report Details:**
        - Title: ${report.title}
        - Asset: ${report.asset}
        - Type: ${report.type}
        - Description: ${report.description}
        - Impact Details: ${report.impact || "N/A"}
        - CVSS Score: ${report.cvssScore} (${report.cvssVector || "N/A"})
        - Triager Note: ${report.triagerNote || "N/A"}

        **Communication History:**
        ${JSON.stringify(relevantEvents, null, 2)}

        **Instructions:**
        1. Evaluate the report's quality, completeness, impact, and how helpful the researcher was in the communication timeline.
        2. Propose a specific integer PKR amount for the bounty. It MUST be between the Minimum Reward (PKR ${rewardRange.min}) and Maximum Reward (PKR ${rewardRange.max}) inclusive.
        3. If the minimum and maximum are 0, return 0.
        4. Provide a brief 1-2 sentence reasoning explaining why this specific amount was chosen.

        **Output Format (JSON):**
        {
            "suggestedAmount": 500,
            "reasoning": "..."
        }
        `;
        const result = await generateWithRetry(model, prompt);
        const response = await result.response;
        const text = response.text();
        return JSON.parse(text);
    }
    catch (error) {
        console.error("Gemini Bounty Suggestion Error:", error);
        throw new Error(`Failed to suggest bounty: ${error.message}`);
    }
};
exports.suggestBountyAmount = suggestBountyAmount;
const generateReportMessage = async (report, timeline, type, bountyAmount) => {
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });
        const relevantEvents = timeline.map(e => ({
            author: e.sender?.name || e.author || 'System',
            role: e.sender?.role || e.role,
            content: e.content,
            type: e.type,
            timestamp: e.createdAt || e.timestamp
        })).slice(-10); // Last 10 events for context
        const BasePrompt = `
        You are a Bug Bounty Program Manager communicating directly with a security researcher who submitted a vulnerability.
        
        **Report Details:**
        - Title: ${report.title}
        - Asset: ${report.asset}
        - Type: ${report.type}
        - Severity/CVSS: ${report.severity} (${report.cvssScore})

        **Recent Communication Context:**
        ${JSON.stringify(relevantEvents, null, 2)}
        `;
        const TypePrompt = type === 'resolve'
            ? `
            **Task:** Write a friendly, professional closing message acknowledging the researcher's report. Inform them that the engineering team has reviewed and successfully patched the issue. Thank them for their contribution to the program's security. Keep it concise (2-3 short paragraphs).
            `
            : `
            **Task:** Write a friendly, professional message informing the researcher that they are being awarded a bounty of PKR ${bountyAmount}. Acknowledge their specific finding by name and thank them for their responsible disclosure. Keep it concise (2-3 short paragraphs).
            `;
        const finalPrompt = `
        ${BasePrompt}
        ${TypePrompt}

        **Crucial Formatting Requirement:**
        The message MUST be formatted strictly as **HTML string** (e.g., using <p>, <strong>, <ul>, <li>, <br/>). Do NOT use any Markdown symbols (no **asterisks**, no ## hashtags). Please add good spacing.

        **Output Format (JSON):**
        {
            "message": "The written message formatted purely in basic HTML, addressing the researcher directly."
        }
        `;
        const result = await generateWithRetry(model, finalPrompt);
        const response = await result.response;
        const text = response.text();
        return JSON.parse(text);
    }
    catch (error) {
        console.error("Gemini Message Generation Error:", error);
        throw new Error(`Failed to generate message: ${error.message}`);
    }
};
exports.generateReportMessage = generateReportMessage;
