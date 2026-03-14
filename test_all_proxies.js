
import fetch from 'node-fetch';

const apiKey = process.env.KIMI_API_KEY;
if (!apiKey) {
    console.error("❌ KIMI_API_KEY not found in environment.");
    process.exit(1);
}

async function testChatProxy() {
    console.log("\n--- Testing Chat Proxy (api/chat.js logic) ---");
    const systemPrompt = `你是一个名为“AI 脉动智能助手”的专家。请简洁、专业地回答用户的问题。`;
    const message = "你好，请问 2026 年 Nvidia 最强显卡是什么？";
    
    const messages = [
        { role: "system", content: systemPrompt },
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
                model: "kimi-k2.5",
                messages: messages,
                thinking: { enabled: false } // Fast Mode
            })
        });

        const result = await response.json();
        if (response.ok) {
            console.log("✅ Chat Response Success!");
            console.log("Reply:", result.choices[0].message.content);
            // Verify structure matches frontend requirement { reply: ... }
            const frontendCompatible = { reply: result.choices[0].message.content };
            console.log("Frontend Data:", JSON.stringify(frontendCompatible, null, 2));
        } else {
            console.error("❌ Chat Response Failed:", result);
        }
    } catch (e) {
        console.error("❌ Chat Network Error:", e.message);
    }
}

async function testNewsProxy() {
    console.log("\n--- Testing News Proxy (api/news.js logic) ---");
    const tools = [
        {
            type: "builtin_function",
            function: {
                name: "$web_search"
            }
        }
    ];

    const systemPrompt = `你是一个 2026 年的顶级 AI 行业主理人。请直接输出符合要求的 JSON，不要进行深度长考。`;
    let messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: "立即搜索并返回 9 条最新的 AI 行业动态。请直接输出符合要求的 JSON，不要进行深度长考。" }
    ];

    try {
        console.log("[Turn 1] Requesting Kimi (Fast Mode)...");
        const resp1 = await fetch('https://api.moonshot.cn/v1/chat/completions', {
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
            })
        });

        const result1 = await resp1.json();
        if (!resp1.ok) throw new Error("Step 1 Failed: " + JSON.stringify(result1));

        const message = result1.choices[0].message;
        console.log("✅ Turn 1 Success. Tool Calls detected:", !!message.tool_calls);

        if (message.tool_calls) {
            const assistantMessage = {
                role: "assistant",
                content: message.content || null,
                tool_calls: message.tool_calls.map(tc => ({
                    id: tc.id,
                    type: tc.type || "builtin_function",
                    function: tc.function
                }))
            };
            messages.push(assistantMessage);

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

            console.log("[Turn 2] Synthesis (JSON Mode + Fast Mode)...");
            const resp2 = await fetch('https://api.moonshot.cn/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "kimi-k2.5",
                    messages: messages,
                    response_format: { type: "json_object" },
                    thinking: { enabled: false }
                })
            });

            const result2 = await resp2.json();
            if (!resp2.ok) throw new Error("Step 3 Failed: " + JSON.stringify(result2));

            const finalContent = result2.choices[0].message.content;
            console.log("✅ Synthesis Success!");
            console.log("Final JSON Snippet:", finalContent.substring(0, 100) + "...");
        } else {
            console.log("ℹ️ Kimi provided direct answer without tools.");
            console.log("Content:", message.content);
        }
    } catch (e) {
        console.error("❌ News Proxy Error:", e.message);
    }
}

async function runAll() {
    await testChatProxy();
    await testNewsProxy();
    console.log("\n🏁 All tests completed.");
}

runAll();
