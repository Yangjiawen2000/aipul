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
                res.setHeader('x-debug-cache', 'HIT');
                return res.status(200).json(cached);
            } else {
                res.setHeader('x-debug-cache', 'MISS-EMPTY');
            }
        } else {
            res.setHeader('x-debug-cache', 'BYPASS-FORCE');
        }
    } catch (cacheErr) {
        console.warn('[API/NEWS] Cache Read Error:', cacheErr.message);
        res.setHeader('x-debug-cache', `ERROR-${cacheErr.message.slice(0, 20)}`);
    }

    const seed = req.query.seed || 'none';
    const systemPrompt = `顶级AI主理人。调取web_search深度搜索2026年3月全球AI动态。
    当前搜索种子：${seed} (若非none，请避开最常见的头条，发掘更多细分领域的深度动态)。
    必须覆盖不同领域：[大模型, 机器人, 算力硬件, 政策, 开源, 生物计算, 能源AI]。
    仅输出JSON：
    {
      "hero": { "title": "...", "summary": "...", "category": "...", "url": "...", "time": "..." },
      "trends": [
        { "title": "...", "summary": "...", "category": "...", "impact": "重要/核心/重大/中等", "priority": 95, "url": "...", "time": "..." }
      ]
    }
    精选 6 条全球热点。必须全部使用中文。不要任何前言。`;

    let messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `深度搜索 6 条独特的全球 AI 动态。种子项: ${seed}。必须中文。 (ID:${Date.now()})` }
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
                thinking: { enabled: false }
            }),
            cache: 'no-store'
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

            // Minimalist synthesis instruction
            messages.push({
                role: "user", 
                content: "Final JSON (hero+4 trends). Real details. Sort by heat."
            });

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
                    temperature: 0,
                    response_format: { type: "json_object" }
                }),
                cache: 'no-store'
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
                const arrays = Object.values(freshData).filter(val => Array.isArray(val) && val.length > 0);
                // Sort by "looks like object array"
                const objectArray = arrays.find(arr => typeof arr[0] === 'object');
                freshData.trends = objectArray || arrays[0] || [];
            }

            // Defensive Item Normalization
            freshData.trends = freshData.trends.map((item, idx) => {
                // If the item is just a string, treat it as the title
                if (typeof item === 'string') {
                    return {
                        title: item,
                        summary: "实时动态：AI 行业发生重大突破，详情请查看最新行业快报。",
                        category: "大模型",
                        impact: "重要",
                        priority: 90 - idx * 2,
                        url: "#",
                        time: "Just Now"
                    };
                }
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
                res.setHeader('x-debug-cache-update', 'SUCCESS');
            } catch (cacheErr) {
                console.warn('[API/NEWS] Cache Write Error:', cacheErr.message);
                res.setHeader('x-debug-cache-update', `FAILED-${cacheErr.message.slice(0, 20)}`);
            }

            return res.status(200).json(freshData);
        }
        throw new Error("Invalid Agent Output");

    } catch (error) {
        console.error('Agentic Proxy Error:', error);
        return res.status(500).json({ error: "Agentic Loop Failed", message: error.message });
    }
}
