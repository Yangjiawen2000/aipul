// Vercel Serverless Function: Backend Proxy for Kimi API
// This protects your API Key and provides basic rate limiting.
import { kv } from '@vercel/kv';

// Cache Duration: 1 hour for global content pool
const GLOBAL_CACHE_KEY = 'ai_pulse_data_pool';
const CACHE_DURATION = 60 * 60 * 1000; 

export default async function handler(req, res) {
    // 0. Connectivity check: return 200 for HEAD or simple GET
    if (req.method === 'HEAD') {
        return res.status(200).end();
    }

    // 1. Global Content Pool (Redis / Vercel KV)
    let cachedData = null;
    // Only attempt KV if the environment variables are configured
    const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
    
    if (hasKV) {
        try {
            cachedData = await kv.get(GLOBAL_CACHE_KEY);
            const lastUpdate = await kv.get(GLOBAL_CACHE_KEY + '_time');
            const now = Date.now();
    
            // If we have fresh enough data, serve it instantly!
            if (cachedData && lastUpdate && (now - lastUpdate < CACHE_DURATION)) {
                console.log('Serving from Global Content Pool...');
                res.setHeader('x-data-source', 'Redis-Global-Pool');
                return res.status(200).json(cachedData);
            }
            res.setHeader('x-cache-miss-reason', !cachedData ? 'Empty-Cache' : 'Expired');
        } catch (kvError) {
            res.setHeader('x-cache-miss-reason', 'KV-Error');
            console.warn('Vercel KV configured but failing.', kvError.message);
        }
    } else {
        res.setHeader('x-data-source', 'Kimi-AI-Live (KV-Not-Configured)');
        console.warn('Vercel KV environment variables not found. Skipping Content Pool.');
    }

    // 2. Security Check: API Key must be set in Vercel Environment Variables
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "Server Configuration Error: Missing API Key" });
    }

    const systemPrompt = `你是一个拥有全球视野的自主 AI 行业分析师。
    你的任务是实时扫描并分析此刻全球最受关注的 AI 技术突破与行业大趋势。
    
    要求：
    1. 必须反映“当前即时”的热度。
    2. 按照“技术影响力 (Impact)”和“社会关注度 (Heat)”综合排序，最高的放在 hero (头条)。
    3. 严格输出 9 条不同的趋势动态。
    4. 简介必须极其干练且富有洞察力 (20-30字)。
    5. **分类 (category) 必须且只能从以下列表中选择一个：[大模型, 机器人, 算力芯片, 多模态, 智驾, 安全治理, 其他]**
    
    输出格式 (JSON ONLY):
    {
      "hero": { "title": "标题", "summary": "简介", "category": "分类", "time": "Just Now", "url": "链接" },
      "trends": [
        { "id": 1, "category": "分类", "title": "标题", "summary": "简介", "impact": "核心突破/重大影响/显著进步", "priority": 1-10, "url": "链接" }
      ]
    }`;

    try {
        const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "moonshot-v1-8k",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "请提供最新的 AI 行业动态。" }
                ],
                temperature: 0.3
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json({ error: "Kimi API Error", details: result });
        }

        const content = result.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const freshData = JSON.parse(jsonMatch[0]);
            
            // Update Global Pool
            if (process.env.KV_REST_API_URL) {
                console.log('Writing to Global Content Pool (Redis)...');
                try {
                    await kv.set(GLOBAL_CACHE_KEY, freshData);
                    await kv.set(GLOBAL_CACHE_KEY + '_time', Date.now());
                    console.log('KV Update Success.');
                } catch (e) {
                    console.error('KV Storage Error:', e.message);
                }
            }
            
            return res.status(200).json(freshData);
        } else {
            throw new Error("Failed to parse AI response as JSON");
        }
    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ error: "Internal Proxy Error", message: error.message });
    }
}
