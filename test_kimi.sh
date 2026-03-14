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
    "thinking": {"enabled": true},
    "temperature": 1
  }')

# 检查是否报错
ERROR=$(echo $RESPONSE1 | grep -o '"error":[^}]*}')
if [ ! -z "$ERROR" ]; then
    echo -e "❌ 步骤 1 失败: $ERROR"
    exit 1
fi

# 提取思考内容和工具调用信息
REASONING=$(echo $RESPONSE1 | sed -n 's/.*"reasoning_content":"\([^"]*\)".*/\1/p')
TOOL_CALL_ID=$(echo $RESPONSE1 | sed -n 's/.*"id":"\(call_[^"]*\)".*/\1/p')
TOOL_ARGS=$(echo $RESPONSE1 | sed -n 's/.*"arguments":"\([^"]*\)".*/\1/p')

echo -e "✅ Kimi 思考完成:\n$REASONING"

if [ ! -z "$TOOL_CALL_ID" ]; then
    echo -e "\n📡 检测到工具调用 ID: $TOOL_CALL_ID"
    echo "🔧 执行搜索参数: $TOOL_ARGS"

    # 2. 步骤 2: 汇总结果 (模拟多轮对话)
    echo -e "\n[Turn 2] 正在进行最终汇总..."
    # 构造极简的消息历史
    FINAL_DATA=$(curl -s -X POST "$BASE_URL" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $API_KEY" \
      -d "{
        \"model\": \"kimi-k2.5\",
        \"messages\": [
          {\"role\": \"system\", \"content\": \"你是一个专业的 AI 行业分析师。\"},
          {\"role\": \"user\", \"content\": \"搜一下 2026 年 Nvidia 最强显卡。\"},
          {
            \"role\": \"assistant\",
            \"content\": null,
            \"reasoning_content\": \"$REASONING\",
            \"tool_calls\": [
              {
                \"id\": \"$TOOL_CALL_ID\",
                \"type\": \"function\",
                \"function\": {\"name\": \"\$web_search\", \"arguments\": \"$TOOL_ARGS\"}
              }
            ]
          },
          {
            \"role\": \"tool\",
            \"tool_call_id\": \"$TOOL_CALL_ID\",
            \"name\": \"\$web_search\",
            \"content\": \"$TOOL_ARGS\"
          }
        ],
        \"thinking\": {\"enabled\": true},
        \"temperature\": 1
      }")

    SUMMARY=$(echo $FINAL_DATA | sed -n 's/.*"content":"\(.*\)","reasoning_content".*/\1/p')
    echo -e "\n✨ 最终总结:\n$SUMMARY"
else
    echo "⚠️ 未检测到工具调用。"
fi

echo -e "\n✅ 验证结束。"
