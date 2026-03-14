// Vercel Serverless Function: Agentic Backend Proxy for Kimi API (v2)
import { kv } from '@vercel/kv';

// 1. Tool Definition for Kimi (Using Native $web_search)
const tools = [
    {
        type: "builtin_function",
        function: {
            name: "$web_search"
        }
    }
];

// 2. Note: Custom Skill implementation replaced by Kimi Native Search
// Content for tool response is now just the arguments from the model as per doc.

export default async function handler(req, res) {
    if (req.method === 'HEAD') return res.status(200).end();

    const forceRefresh = req.query.force === 'true' || req.headers['x-vercel-cron'] === '1';

    // 4. Agentic Interaction with Kimi
    // NOTE: Kimi k2.5 can be slow. Vercel Hobby has a 10s limit. 
    // We use a highly aggressive prompt to try and stay under the limit.
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing API Key" });

    console.log('[API/NEWS] Starting Kimi Request...');

    const CACHE_KEY = 'ai_pulse_news_v2';
    
    // 5. Try Cache First (Unless Forced)
    try {
        if (!forceRefresh) {
            const cached = await kv.get(CACHE_KEY);
            if (cached) {
                console.log('[API/NEWS] Serving from Cloud Cache');
                res.setHeader('x-data-source', 'Vercel-KV-Cache');
                return res.status(200).json(cached);
            }
        }
    } catch (cacheErr) {
        console.warn('[API/NEWS] Cache Read Error:', cacheErr.message);
        // Continue to fresh fetch
    }

    const systemPrompt = `你是一个顶级 AI 行业主理人。调取 web_search 搜索 2026年3月 AI 动态。
    基于搜索结果，筛选 6 条最具热度和影响力的动态，按热度降序排列。
    必须直接输出如下 JSON 格式：
    {
      "hero": { "title": "...", "summary": "...", "category": "...", "url": "...", "time": "..." },
      "trends": [
        { "title": "...", "summary": "...", "category": "...", "impact": "重要/核心/重大/中等", "priority": 95, "url": "...", "time": "..." }
      ]
    }
    分类限选：[大模型, 机器人, 算力芯片, 多模态, 智驾, 安全治理, 其他]`;

    let messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: "搜索并整理今日 6 条热度最高的 AI 行业动态。直接输出合规 JSON。不要长考。" }
    ];

    try {
        // Step 1: Request Kimi to decide if a tool is needed
        let response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "kimi-k2.5",
                messages: messages,
                tools: tools,
                tool_choice: "auto",
                thinking: { enabled: false } // Disable thinking for Vercel Hobby (Speed > Depth)
            })
        });

        let result = await response.json();

        if (!response.ok) {
            console.error('Kimi API Step 1 Error:', result);
            return res.status(response.status).json({ error: "Moonshot API Step 1 Failed", details: result });
        }

        let message = result.choices[0].message;

        // Step 2: Handle Native Tool Calls (Multi-turn Agent)
        if (message.tool_calls) {
            // CRITICAL: Preserve reasoning_content and tool_calls for k2.5 stability
            // We map the message exactly as returned by the model to maintain the thinking state.
            const assistantMessage = {
                role: "assistant",
                content: message.content || null,
                reasoning_content: message.reasoning_content || undefined,
                tool_calls: message.tool_calls.map(tc => ({
                    id: tc.id,
                    type: tc.type || "builtin_function",
                    function: tc.function
                }))
            };
            messages.push(assistantMessage);

            for (const toolCall of message.tool_calls) {
                if (toolCall.function.name === "$web_search") {
                    // For builtin $web_search, content must be the original arguments string
                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        name: "$web_search",
                        content: toolCall.function.arguments
                    });
                }
            }

            // Step 3: Get final synthesis using JSON Mode
            response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "moonshot-v1-32k",
                    messages: messages,
                    response_format: { type: "json_object" } // Enable JSON Mode
                })
            });
            result = await response.json();

            if (!response.ok) {
                console.error('Kimi API Step 3 Error:', result);
                return res.status(response.status).json({ error: "Moonshot API Step 3 Failed", details: result });
            }
        }

        const finalContent = result.choices[0].message.content;
        const jsonMatch = finalContent.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            let freshData = JSON.parse(jsonMatch[0]);

            // Heuristic Normalization: Find the main array regardless of key name
            if (!freshData.trends || !Array.isArray(freshData.trends)) {
                console.warn('Backend Normalization: Heuristically searching for content array.');
                const firstArray = Object.values(freshData).find(val => Array.isArray(val));
                freshData.trends = firstArray || [];
            }

            // Defensive Item Normalization
            freshData.trends = freshData.trends.map((item, idx) => {
                // Handle if trends is an array of strings or unexpected types
                const base = (typeof item === 'object' && item !== null) ? item : {};
                return {
                    title: base.title || base.news_title || `AI Pulse Update #${idx + 1}`,
                    summary: base.summary || base.description || base.content || "详细内容请查看原文。",
                    category: base.category || "其他",
                    impact: base.impact || "中等",
                    priority: base.priority || 70,
                    url: base.url || base.link || "#",
                    time: base.time || "Just Now"
                };
            });

            if (!freshData.hero) {
                console.warn('Backend Normalization: Repairing missing hero object.');
                freshData.hero = freshData.trends[0] || { title: "AI Pulse 2026", summary: "极智先锋，领航未来。", category: "智驾", time: "Just Now", url: "#" };
            }

            // Ensure we have at least some trends
            if (freshData.trends.length === 0) {
                freshData.trends.push({ ...freshData.hero, id: 'manual-1' });
            }

            res.setHeader('x-data-source', 'Kimi-Agentic-Discovery');
            
            // 6. Async Update Cache
            try {
                await kv.set(CACHE_KEY, freshData, { ex: 86400 }); // Cache for 24 hours
                console.log('[API/NEWS] Cloud Cache Updated');
            } catch (cacheErr) {
                console.warn('[API/NEWS] Cache Write Error:', cacheErr.message);
            }

            return res.status(200).json(freshData);
        }
        throw new Error("Invalid Agent Output");

    } catch (error) {
        console.error('Agentic Proxy Error:', error);
        return res.status(500).json({ error: "Agentic Loop Failed", message: error.message });
    }
}
