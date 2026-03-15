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

    const apiKey = process.env.KIMI_API_KEY;
    const topic = req.query.topic || 'general';
    const seed = req.query.seed || 'none';
    const isCron = req.headers['x-vercel-cron'] === '1';
    const forceRefresh = req.query.force === 'true' || isCron;

    if (!apiKey) {
        console.error('[API/NEWS] Missing KIMI_API_KEY environment variable.');
        return res.status(500).json({ error: "Server Configuration Error", message: "Missing API Key" });
    }

    // --- CRON WARMING LOGIC ---
    if (isCron) {
        console.log('[API/CRON] Starting Triple-Topic Cache Warming...');
        const topics = ['general', 'biomed', 'tools'];
        const results = await Promise.allSettled(topics.map(t => performAiDiscovery(t, 'cron-warm', apiKey)));
        
        let report = {};
        for (let i = 0; i < topics.length; i++) {
            const t = topics[i];
            const res = results[i];
            if (res.status === 'fulfilled') {
                await kv.set(`ai_pulse_news_v2_${t}`, res.value, { ex: 86400 });
                report[t] = 'Warmed';
            } else {
                report[t] = `Error: ${res.reason.message}`;
            }
        }
        return res.status(200).json({ status: "Cron Complete", report });
    }

    const CACHE_KEY = `ai_pulse_news_v2_${topic}`;
    
    // --- CLOUD-FIRST CACHE HIT ---
    try {
        if (!forceRefresh) {
            const cached = await kv.get(CACHE_KEY);
            if (cached) {
                console.log(`[API/NEWS] Serving Topic [${topic}] from Cloud Cache`);
                res.setHeader('x-data-source', 'Vercel-KV-Cache');
                return res.status(200).json(cached);
            }
        }
    } catch (cacheErr) {
        console.warn(`[API/NEWS] Cache Read Error for [${topic}]:`, cacheErr.message);
    }

    // --- REAL-TIME DISCOVERY FALLBACK ---
    try {
        console.log(`[API/NEWS] Performing Real-time Discovery for Topic [${topic}]...`);
        const freshData = await performAiDiscovery(topic, seed, apiKey);
        
        // Update cache in background
        kv.set(CACHE_KEY, freshData, { ex: 86400 }).catch(e => console.error('Cache Write Error:', e));
        
        res.setHeader('x-data-source', 'Kimi-Agentic-Discovery');
        return res.status(200).json(freshData);
    } catch (error) {
        console.error('API Error:', error.message, error.stack);
        return res.status(500).json({ 
            error: "Discovery Failed", 
            message: error.message,
            tip: "If this persists, check Vercel logs or verify KIMI_API_KEY validity."
        });
    }
}

/**
 * Core AI Discovery Logic
 */
async function performAiDiscovery(topic, seed, apiKey) {
    const now = new Date();
    const dateRef = now.toLocaleDateString('zh-CN');

    let topicInstruction = "深度搜索全球AI动态，包含大模型、硬件、政策等全领域。";
    if (topic === 'biomed') {
        topicInstruction = "专项搜索【AI在生物医学/生命科学】领域的最新进展。必须包含：最新的科研论文(Nature/Science等)、蛋白质结构预测、新药研发突破、AI医疗影像或临床新发现。";
    } else if (topic === 'tools') {
        topicInstruction = "专项搜索最新的【AI工具与应用】。重点关注：AI Coding编辑器(Cursor/Windsurf等)、效率工具、视频生成工具、智能Agent应用或开发者库。";
    }

    const systemPrompt = `顶级AI主理人。今天是 ${dateRef}。
    任务：${topicInstruction}
    时效：必须是【最近3天内】的动态。
    【严控高质量来源】：
    - 全球顶级媒体：TechCrunch, Wired, The Verge, MIT Technology Review, IEEE Spectrum.
    - 科研/论文：Nature, Science, arXiv, NeurIPS/ICLR 最新收录.
    - 官方动态：OpenAI Blog, Claude/Anthropic News, Google DeepMind, NVIDIA Blog, Meta AI.
    - 医疗专项：PubMed, Cell, The Lancet.
    严禁任何聚合类、低质量博客或过时信息。
    
    仅输出JSON：
    {
      "hero": { "title": "...", "summary": "...", "category": "...", "url": "...", "time": "..." },
      "trends": [
        { "title": "...", "summary": "...", "category": "...", "impact": "重要/核心/重大/中等", "priority": 95, "url": "...", "time": "..." }
      ]
    }
    精选 6 条。必须中文，不要前言。`;

    let messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `针对主题 [${topic}]，从顶级信源搜寻并整理最近3天内的 6 条独特全球 AI 动态。必须中文且严控时间。 (ID:${Date.now()})` }
    ];

    // Step 1: Agentic Search
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
    if (!response.ok) throw new Error(`Kimi Step 1 Failed: ${JSON.stringify(result)}`);

    let message = result.choices[0].message;

    // Step 2: Synthesis (if search was performed)
    if (message.tool_calls) {
        messages.push({
            role: "assistant",
            content: message.content || null,
            reasoning_content: message.reasoning_content || undefined,
            tool_calls: message.tool_calls
        });

        for (const toolCall of message.tool_calls) {
            if (toolCall.function.name === "$web_search") {
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: "$web_search",
                    content: toolCall.function.arguments
                });
            }
        }

        messages.push({ role: "user", content: "Final JSON (hero+6 trends). Real details. Sort by heat." });

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
            })
        });
        result = await response.json();
        if (!response.ok) throw new Error(`Kimi Step 3 Failed: ${JSON.stringify(result)}`);
    }

    const finalContent = result.choices[0].message.content;
    const jsonMatch = finalContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");

    let freshData = JSON.parse(jsonMatch[0]);

    // Normalization
    if (!freshData.trends || !Array.isArray(freshData.trends)) {
        const arrays = Object.values(freshData).filter(val => Array.isArray(val));
        freshData.trends = (arrays.find(arr => typeof arr[0] === 'object') || arrays[0] || []).slice(0, 6);
    }
    
    freshData.trends = freshData.trends.map((item, idx) => ({
        title: item.title || "AI Pulse Update",
        summary: item.summary || "详细内容请查看原文。",
        category: item.category || "其他",
        impact: item.impact || "中等",
        priority: item.priority || 70,
        url: item.url || "#",
        time: item.time || "Just Now"
    }));

    if (!freshData.hero) freshData.hero = freshData.trends[0];
    
    return freshData;
}
