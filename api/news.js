// Vercel Serverless Function: Agentic Backend Proxy for Kimi API (v2)
import { kv } from '@vercel/kv';

const GLOBAL_CACHE_KEY = 'ai_pulse_data_pool_v2'; // Bump version for 2026/Agentic
const CACHE_DURATION = 60 * 60 * 1000; 

// 1. Tool Definition for Kimi
const tools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "搜索实时科技新闻、AI 突破和 2026 年行业动态。返回网页摘要和链接。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "搜索关键词（如：GPT-6 发布的最新进展, 2026 AI 芯片突破）" }
        },
        required: ["query"]
      }
    }
  }
];

// 2. Skill implementation (Jina Search)
async function performWebSearch(query) {
    console.log(`Executing Skill: Web Search for "${query}"`);
    try {
        const response = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
            headers: { 'Accept': 'application/json' }
        });
        const result = await response.json();
        // Return only relevant snippets to stay within token limits
        return JSON.stringify(result.data.slice(0, 5).map(item => ({
            title: item.title,
            snippet: item.description,
            url: item.url
        })));
    } catch (e) {
        console.error('Search Skill Failed:', e.message);
        return "搜索功能暂时不可用，请基于你的知识存储回答最新资讯，但务必标注当前时间线。";
    }
}

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
                model: "moonshot-v1-8k",
                messages: messages,
                tools: tools,
                tool_choice: "auto"
            })
        });

        let result = await response.json();
        let message = result.choices[0].message;

        // Step 2: Handle Tool Calls (Multi-turn Agent)
        if (message.tool_calls) {
            for (const toolCall of message.tool_calls) {
                if (toolCall.function.name === "web_search") {
                    const args = JSON.parse(toolCall.function.arguments);
                    const searchResults = await performWebSearch(args.query);
                    
                    messages.push(message); // Kimi's tool call request
                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        name: "web_search",
                        content: searchResults
                    });
                }
            }

            // Step 3: Get the final synthesized response from Kimi
            response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "moonshot-v1-32k",
                    messages: messages
                })
            });
            result = await response.json();
        }

        const finalContent = result.choices[0].message.content;
        const jsonMatch = finalContent.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const freshData = JSON.parse(jsonMatch[0]);
            
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
        return res.status(500).json({ error: "Agentic Loop Failed", message: error.message });
    }
}
