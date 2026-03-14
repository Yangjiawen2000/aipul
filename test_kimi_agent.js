/**
 * Kimi k2.5 Agentic Demo (Standalone)
 * 验证：1. API 连贯性 2. 原生搜索工具 ($web_search) 3. 思维链 (reasoning_content) 透传
 */

const API_KEY = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
const BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

if (!API_KEY) {
    console.error('❌ 错误: 未找到 API Key。请设置环境变量 KIMI_API_KEY 或 MOONSHOT_API_KEY');
    process.exit(1);
}

async function runDemo() {
    console.log('🚀 启动 Kimi k2.5 代理验证程序...');

    const messages = [
        { role: "system", content: "你是一个专业的 AI 行业分析师。请搜索并总结 2026 年最新的 AI 动态。" },
        { role: "user", content: "帮我搜一下 2026 年 Nvidia 最强大的显卡型号及其性能参数。" }
    ];

    const tools = [
        {
            type: "builtin_function",
            function: {
                name: "$web_search"
            }
        }
    ];

    try {
        // --- 步骤 1: 思考并决定使用工具 ---
        console.log('\n[Turn 1] 正在请求 Kimi 进行规划...');
        const res1 = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "kimi-k2.5",
                messages: messages,
                tools: tools,
                tool_choice: "auto",
                thinking: { enabled: true },
                temperature: 1
            })
        });

        const data1 = await res1.json();
        if (!res1.ok) throw new Error(`Step 1 Failed: ${JSON.stringify(data1)}`);

        const assistantMsg = data1.choices[0].message;
        console.log('✅ Kimi 已产生初步规划 (Thinking):');
        console.log('--- Thinking Block ---');
        console.log(assistantMsg.reasoning_content || '(无思考内容)');
        console.log('----------------------');

        if (assistantMsg.tool_calls) {
            console.log(`📡 检测到工具调用: ${assistantMsg.tool_calls[0].function.name}`);
            
            // 将 Assistant 的回复（含理由和工具调用）推入历史
            messages.push(assistantMsg);

            // --- 步骤 2: 模拟/透传工具响应 ---
            // 注意：对于 builtin_function，我们只需要将参数作为 content 返回
            for (const toolCall of assistantMsg.tool_calls) {
                console.log(`🔧 执行工具: ${toolCall.function.name} 参数: ${toolCall.function.arguments}`);
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: toolCall.function.arguments 
                });
            }

            // --- 步骤 3: 最终汇总 ---
            console.log('\n[Turn 2] 正在进行最终数据汇总...');
            const res2 = await fetch(BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: "kimi-k2.5",
                    messages: messages,
                    thinking: { enabled: true }
                })
            });

            const data2 = await res2.json();
            if (!res2.ok) throw new Error(`Step 3 Failed: ${JSON.stringify(data2)}`);

            console.log('✨ 最终回答:');
            console.log(data2.choices[0].message.content);
        } else {
            console.log('⚠️ 未检测到工具调用，回答如下:');
            console.log(assistantMsg.content);
        }

        console.log('\n✅ 验证流程圆满结束！');

    } catch (err) {
        console.error('\n❌ 流程中断:', err.message);
    }
}

runDemo();
