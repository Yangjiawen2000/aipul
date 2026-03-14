// Vercel Serverless Function: Agentic Backend Proxy for Kimi API (v2)
import { kv } from '@vercel/kv';

const GLOBAL_CACHE_KEY = 'ai_pulse_data_pool_v2'; // Bump version for 2026/Agentic
const CACHE_DURATION = 60 * 60 * 1000; 

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

    const forceRefresh = req.query.force === 'true';
    const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
    
    // 3. Cache Check
    if (hasKV && !forceRefresh) {
        try {
            const cachedData = await kv.get(GLOBAL_CACHE_KEY);
            const lastUpdate = await kv.get(GLOBAL_CACHE_KEY + '_time');
            if (cachedData && lastUpdate && (Date.now() - lastUpdate < CACHE_DURATION)) {
                res.setHeader('x-data-source', 'Redis-Global-Pool');
                return res.status(200).json(cachedData);
            }
        } catch (kvError) {
            console.warn('KV Access Error:', kvError.message);
        }
    }

    // 4. Agentic Interaction with Kimi
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing API Key" });

    const systemPrompt = `你是一个 2026 年的顶级 AI 行业主理人。
    你的职责是：
    1. 使用 web_search 技能搜索此时此刻（2026年3月）真实的世界动态。
    2. 基于搜索到的真实科技媒体链接和事实，整理成一份 9 条动态的 JSON 报告。
    3. 严禁虚构 URL，必须使用搜索结果中的真实链接。
    
    分类限选：[大模型, 机器人, 算力芯片, 多模态, 智驾, 安全治理, 其他]`;

    let messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: "搜索并分析当前（2026年3月）全球最震憾的 9 条 AI 行业动态，并按要求输出 JSON。" }
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
                tool_choice: "auto"
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
            messages.push(message); 
            
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
                    model: "kimi-k2.5",
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
            
            // Normalize Data Structure (Repair if Agentic Kimi missed a key)
            if (!freshData.trends || !Array.isArray(freshData.trends)) {
                console.warn('Backend Normalization: Repairing missing trends array.');
                freshData.trends = freshData.trends || freshData.updates || freshData.news || [];
                if (!Array.isArray(freshData.trends) && typeof freshData.trends === 'object') {
                    freshData.trends = Object.values(freshData.trends);
                }
            }
            
            if (!freshData.hero) {
                console.warn('Backend Normalization: Repairing missing hero object.');
                freshData.hero = freshData.trends[0] || { title: "AI Pulse 2026", summary: "极智先锋，领航未来。", category: "智驾", time: "Just Now", url: "#" };
            }

            // Ensure we have exactly 9 trends for the grid layout (if possible)
            if (freshData.trends.length < 9 && freshData.trends.length > 0) {
                while(freshData.trends.length < 9) {
                    freshData.trends.push({...freshData.trends[0], id: Math.random()});
                }
            }
            
            // 5. Update Global Pool
            if (hasKV) {
                await kv.set(GLOBAL_CACHE_KEY, freshData);
                await kv.set(GLOBAL_CACHE_KEY + '_time', Date.now());
            }
            
            res.setHeader('x-data-source', 'Kimi-Agentic-Discovery');
            return res.status(200).json(freshData);
        }
        throw new Error("Invalid Agent Output");

    } catch (error) {
        console.error('Agentic Proxy Error:', error);
        
        // GRACEFUL DEGRADATION: If AI fails (429, Timeout, etc.), try to serve stale but valid KV data
        if (hasKV) {
            try {
                const staleData = await kv.get(GLOBAL_CACHE_KEY);
                if (staleData) {
                    console.log('Serving Stale Data due to AI Error');
                    res.setHeader('x-data-source', 'Redis-Global-Pool (Stale-Fallback)');
                    return res.status(200).json(staleData);
                }
            } catch (kvError) {
                console.error('Stale Fallback Failed:', kvError.message);
            }
        }
        
        return res.status(500).json({ error: "Agentic Loop Failed", message: error.message });
    }
}
