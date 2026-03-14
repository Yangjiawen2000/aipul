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
    const forceRefresh = req.query.force === 'true';
    
    // DEBUG: Log available ENV keys
    console.log('Available Env Keys:', Object.keys(process.env).filter(k => k.includes('KV') || k.includes('REDIS') || k.includes('KIMI')));

    // Only attempt KV if configured and not forcing a refresh
    const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
    
    if (hasKV && !forceRefresh) {
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

    const systemPrompt = `你是一个拥有全球视野的顶级 AI 行业分析师。
    你的任务是搜索并分析此时此刻全球最真实、最前沿的 AI 技术突破与行业动态。
    
    关键要求：
    1. **真实性**：严禁虚构。所有资讯必须基于 2024-2025 年真实的行业新闻。
    2. **真实链接 (URL)**：url 字段必须是**真实存在的权威科技媒体链接**（如 TechCrunch, The Verge, 36Kr, IT之家, OpenAI Blog 等）。**严禁使用 example.com 或占位符链接。**
    3. **即时热度**：按照技术影响力和社会关注度排序，最震撼的放在 hero 处。
    4. **数量**：严格输出 9 条不同的动态。
    5. **分类 (category)**：必须从 [大模型, 机器人, 算力芯片, 多模态, 智驾, 安全治理, 其他] 中选择。
    
    输出格式 (JSON ONLY):
    {
      "hero": { "title": "标题", "summary": "简介", "category": "分类", "time": "Just Now", "url": "真实新闻链接" },
      "trends": [
        { "id": 1, "category": "分类", "title": "标题", "summary": "简介", "impact": "核心突破/重大影响/显著进步", "priority": 1-10, "url": "真实新闻链接" }
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
