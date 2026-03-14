#!/bin/bash

# Kimi k2.5 Agentic Demo (Shell/Curl version)
# 解决用户环境中没有 Node.js 的问题

API_KEY=${KIMI_API_KEY:-"sk-UHtP1q7J0thHdd7mPrEomZ67c77EW6MfJwK1Oz59bJ4N0RMY"}
BASE_URL="https://api.moonshot.cn/v1/chat/completions"

echo "🚀 启动 Kimi k2.5 代理验证 (Curl 版)..."

# 1. 步骤 1: 规划与工具调用
echo -e "\n[Turn 1] 正在请求 Kimi 进行规划..."
RESPONSE1=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "model": "kimi-k2.5",
    "messages": [
      {"role": "system", "content": "你是一个专业的 AI 行业分析师。请总结 2026 年最新 AI 动态。"},
      {"role": "user", "content": "搜一下 2026 年 Nvidia 最强显卡。"}
    ],
    "tools": [{"type": "builtin_function", "function": {"name": "$web_search"}}],
    "tool_choice": "auto",
    "thinking": {"enabled": true}
  }')

# 检查是否报错
ERROR=$(echo $RESPONSE1 | grep -o '"error":[^}]*}')
if [ ! -z "$ERROR" ]; then
    echo -e "❌ 步骤 1 失败: $ERROR"
    exit 1
fi

# 使用 Python 进行可靠的 JSON 解析 (macOS 自带)
REASONING=$(python3 -c "import sys, json; data = json.load(sys.stdin); print(data['choices'][0]['message'].get('reasoning_content', ''))" <<< "$RESPONSE1")
TOOL_CALL=$(python3 -c "import sys, json; data = json.load(sys.stdin); msg = data['choices'][0]['message']; tc = msg.get('tool_calls', [{}])[0]; print(json.dumps(tc))" <<< "$RESPONSE1")

TOOL_CALL_ID=$(python3 -c "import sys, json; data = json.loads(sys.argv[1]); print(data.get('id', ''))" "$TOOL_CALL")
TOOL_ARGS=$(python3 -c "import sys, json; data = json.loads(sys.argv[1]); print(data.get('function', {}).get('arguments', ''))" "$TOOL_CALL")

if [ -z "$REASONING" ]; then
    echo "⚠️ 未提取到思考内容。"
else
    echo -e "✅ Kimi 思考完成:\n$REASONING"
fi

if [ ! -z "$TOOL_CALL_ID" ] && [ "$TOOL_CALL_ID" != "None" ]; then
    echo -e "\n📡 检测到工具调用 ID: $TOOL_CALL_ID"
    echo "🔧 执行搜索参数: $TOOL_ARGS"

    # 2. 步骤 2: 汇总结果 (模拟多轮对话)
    echo -e "\n[Turn 2] 正在进行最终汇总..."
    
    # 构造完整的 JSON Payload
    PAYLOAD=$(python3 -c "
import sys, json
api_key = sys.argv[1]
base_url = sys.argv[2]
reasoning = sys.argv[3]
tc_id = sys.argv[4]
tc_args = sys.argv[5]

payload = {
    'model': 'kimi-k2.5',
    'messages': [
        {'role': 'system', 'content': '你是一个专业的 AI 行业分析师。'},
        {'role': 'user', 'content': '搜一下 2026 年 Nvidia 最强显卡。'},
        {
            'role': 'assistant',
            'content': None,
            'reasoning_content': reasoning,
            'tool_calls': [
                {
                    'id': tc_id,
                    'type': 'builtin_function',
                    'function': {'name': '\$web_search', 'arguments': tc_args}
                }
            ]
        },
        {
            'role': 'tool',
            'tool_call_id': tc_id,
            'name': '\$web_search',
            'content': tc_args
        }
    ],
    'thinking': {'enabled': True}
}
print(json.dumps(payload))
" "$API_KEY" "$BASE_URL" "$REASONING" "$TOOL_CALL_ID" "$TOOL_ARGS")

    FINAL_DATA=$(curl -s -X POST "$BASE_URL" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $API_KEY" \
      -d "$PAYLOAD")

    SUMMARY=$(python3 -c "import sys, json; data = json.load(sys.stdin); print(data['choices'][0]['message'].get('content', '无法获取回答'))" <<< "$FINAL_DATA")
    echo -e "\n✨ 最终总结:\n$SUMMARY"
else
    echo "⚠️ 未检测到工具调用。原始回复: $RESPONSE1"
fi

echo -e "\n✅ 验证结束。"
