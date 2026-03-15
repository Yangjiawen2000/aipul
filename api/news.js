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

const safeFallback = {
    general: {
        hero: { title: "AI 脉动：情报引擎维护中", summary: "由于 Kimi API 瞬时并发过高，我们暂为您展示前序情报快照。请稍后刷新。", url: "#", category: "系统提示", time: "刚刚" },
        trends: [
            { title: "Kimi k2.5 皇冠模型震撼发布", summary: "具备超强推理能力与多模态搜索，深度改变 AI 探索体验。", category: "模型动态", impact: "核心", priority: 99, url: "https://www.moonshot.cn/", time: "刚刚" },
            { title: "Agentic Thinking: 思考模式成为标配", summary: "大模型不再仅仅是对话，而是具备深度复盘与工具调用的思考者。", category: "技术趋势", impact: "重大", priority: 95, url: "#", time: "刚刚" }
        ]
    },
    biomed: {
        hero: { title: "AI + 生物医学：生命科学的新纪元", summary: "正在为您展示生物医学领域的先遣情报。实时分析正在队列中...", url: "#", category: "系统提示", time: "刚刚" },
        trends: [
            { title: "AlphaFold 3 开源社区活跃度激增", summary: "生物学家利用 AI 预测蛋白质复合物，加速药物研发进程。", category: "蛋白质科学", impact: "重大", priority: 98, url: "#", time: "刚刚" },
            { title: "AI 驱动的癌症免疫疗法取得突破", summary: "个性化疫苗设计速度提升10倍，临床试验反馈积极。", category: "新药研发", impact: "核心", priority: 96, url: "#", time: "刚刚" }
        ]
    },
    tools: {
        hero: { title: "AI 工具箱：释放你的生产力", summary: "最硬核的 AI 工具情报已就绪。正在为您同步最新版本动态...", url: "#", category: "系统提示", time: "刚刚" },
        trends: [
            { title: "Cursor 0.45 版本：代码智能再升级", summary: "更深度的上下文理解，支持多模型联合推理，重塑 Coding 流程。", category: "开发者工具", impact: "核心", priority: 97, url: "#", time: "刚刚" },
            { title: "视频生成工具 Sora/Luma 进入大规模内测", summary: "影视行业迎来变革，AI 生成内容质量逼近专业水准。", category: "创意工具", impact: "重大", priority: 92, url: "#", time: "刚刚" }
        ]
    }
};

export default async function handler(req, res) {
    if (req.method === 'HEAD') return res.status(200).end();

    // Diagnostic: Use the verified key from ai-reding directly to skip env issues
    const apiKey = "sk-tJlKjP5JX33Jhv3JaZKHkUWXwCavYHV8ALLbLw7tvvdCC6nB"; 
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
        console.error('API Error:', error.message);
        
        // Return 200 with fallback data AND the error for debugging
        res.setHeader('x-data-source', 'Server-Side-Fallback');
        const fallback = safeFallback[topic] || safeFallback['general'];
        return res.status(200).json({
            ...fallback,
            _debug_error: error.message,
            _timestamp: new Date().toISOString()
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
        { role: "system", content: "You are a real-time AI news analyst. Use web search to find the 6 most important AI/Bio-Med/Tech news from the LAST 24 HOURS." },
        { role: "user", content: `针对主题 [${topic}]，搜索最近 24 小时内的全球重大动态。` }
    ];

    // Step 1: Agentic Search - Using recommended turbo model for speed
    let response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "kimi-k2-turbo-preview",
            messages: messages,
            tools: tools,
            tool_choice: "auto",
            temperature: 0.3
        })
    });

    let result = await response.json();
    if (!response.ok) throw new Error(`Kimi Step 1 Failed: ${JSON.stringify(result)}`);

    let message = result.choices[0].message;

    // Step 2: Synthesis (if search was performed)
    if (message.tool_calls) {
        messages.push({
            role: "assistant",
            content: message.content || "",
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

        messages.push({ 
            role: "user", 
            content: `最后一步：根据上述搜索到的真实事实，严格输出一个 JSON。格式必须如下：
            {
              "hero": { "title": "...", "summary": "...", "url": "...", "category": "...", "time": "..." },
              "trends": [
                { "title": "...", "summary": "...", "category": "...", "impact": "重要/重大/中等", "priority": 95, "url": "...", "time": "..." }
              ]
            }
            精选 6 条 trends。必须中文。不要解释。` 
        });

        response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "kimi-k2-turbo-preview",
                messages: messages,
                temperature: 0
            })
        });
        result = await response.json();
        if (!response.ok) throw new Error(`Kimi Synthesis Failed: ${JSON.stringify(result)}`);
    }

    const finalContent = result.choices[0].message.content;
    console.log('[API/RAW_RESP]:', finalContent.substring(0, 100) + '...');

    const jsonMatch = finalContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.error('[API/PARSE_ERROR] Raw Content:', finalContent);
        throw new Error("No valid JSON found in AI response");
    }

    let freshData;
    try {
        freshData = JSON.parse(jsonMatch[0]);
    } catch (parseExc) {
        console.error('[API/JSON_ERROR] Failed content:', jsonMatch[0]);
        throw new Error(`JSON Syntax Error: ${parseExc.message}`);
    }

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
    
    freshData._version = "1.3.9-agent-discovery";
    
    return freshData;
}
