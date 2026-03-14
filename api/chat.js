// Vercel Serverless Function: Backend Proxy for Kimi Chat
// Handles AI Q&A interactions securely.

export default async function handler(req, res) {
    // Handle connectivity check
    if (req.method === 'HEAD') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { message, history } = req.body;

    // Security Check: API Key must be set in Vercel Environment Variables
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "Server Configuration Error: Missing API Key" });
    }

    const systemPrompt = `你是一个名为“AI 脉动智能助手”的专家。
    你对 2025 年的 AI 趋势、GPT-5、机器人学、自动驾驶等前沿领域有深刻见解。
    请简洁、专业地回答用户的问题。如果问题超出了 AI 领域，请礼貌地将话题引回 AI 脉动。
    尽量使用中文回答。`;

    const messages = [
        { role: "system", content: systemPrompt },
        ...(history || []),
        { role: "user", content: message }
    ];

    try {
        const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "moonshot-v1-32k",
                messages: messages,
                temperature: 0.7
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json({ error: "Kimi API Error", details: result });
        }

        const reply = result.choices[0].message.content;
        return res.status(200).json({ reply });

    } catch (error) {
        console.error('Chat Proxy Error:', error);
        return res.status(500).json({ error: "Internal Proxy Error", message: error.message });
    }
}
