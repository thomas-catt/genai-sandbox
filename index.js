const express = require("express");
require("dotenv").config();
const OpenAI = require("openai");
const app = require("express")();
const cors = require("cors");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const port = 8080;
const client = new OpenAI({
    apiKey: process.env.GENAI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

let messages = [
    // {
    //     role: "system",
    //     content: "**You are an app building JSON-based assistant.**. The client can ask for modifications to the webpage (its current state will be given to you)."
    // },
    // {
    //     role: "system",
    //     content: "You will strictly only use HTML to format your response replacing all use of markdown. This includes code blocks and inline code. Do not use any other formatting or markdown syntax."
    // },
    // {
    //     role: "system",
    //     content: `It is mandatory for you to respond in the following format:
    //         {\"success\": true, \"message\": \"[the entire contents of your HTML formatted message]\"}

    //         Don't format this JSON with a code block, your message response should always be a plain JSON string.`
    // },
    // {
    //     role: "system",
    //     content: "For your app building part, you will use a separate `changes` field in the JSON response. This field will contain ONLY JavaScript code. This code should be sufficient to produce ALL forms of changes (HTML, CSS or JavaScript) to the current webpage. You will not use any other field for this purpose. This will function similar to any agent-based AI assistant where the AI can respond and edit code in parallel. The current webpage state will be given to you as a system-role message."
    // },
    {
        role: "system",
        content: `
        You are an assistant that ONLY replies with a JSON object in the following structure:

        {
            "success": true,
            "message": \`[an HTML-formatted string with no markdown]\`,
            "code": true | false // true if your response contains code changes, false otherwise
        }

        Instructions:
        1. Never use markdown formatting.
        2. Format your 'message' field using raw HTML (e.g., <b>, <div>, <p>).
        3. Do NOT use triple backticks or any markdown formatting. Also, don't explain any code with comments.
        4. Your response must be a valid JSON object — no prose, no explanations.

        Your response is directly given to a JSON.parse() function, so ensure it is a valid JSON string.
        `
    }
];

async function chat(req, res) {
    const { content, pageBody } = req.body;
    if (pageBody)
        messages.push({role: "user", __private: true, content: "I only need unformatted and uncommented code in response to this message coreseponding to the current webpage state. If JavaScript is requested, enclose any JavaScript in <script></script>. If you want to add HTML elements, use JavaScript's `document.appendChild()`. Current webpage state: " + pageBody});
    messages.push({role: "user", content});

    const response = await client.chat.completions.create({
        model: "gemini-2.5-flash",
        reasoning_effort: "low",
        messages
    });

    const chosenMessage = response.choices[0].message;    
    messages.push(chosenMessage);
    console.log(chosenMessage);
    
    const parsedResponse = JSON.parse(chosenMessage.content);
    return res.send(parsedResponse);
}

async function getMessages(req, res) {
    return res.send({success: true, messages: messages.filter(m => m.role != 'system' && m.__private != true)});
}

async function errorHandlingMiddleware(err, req, res, next) {
    console.error("Error " + err.status, err);
    var message = "Failed to process request";

    switch (err.status) {
        case 401:
            message = "Unauthorized.";
            break;
        case 429:
            message = "Rate limit exceeded.";
            break;
    }
    
    res.status(500).send({
        success: false, message
    });
}

app.post("/chat", chat);
app.get("/messages", getMessages);
app.use(errorHandlingMiddleware);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});