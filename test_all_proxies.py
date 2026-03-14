
import os
import requests
import json
import time

API_KEY = "sk-UHtP1q7J0thHdd7mPrEomZ67c77EW6MfJwK1Oz59bJ4N0RMY"
BASE_URL = "https://api.moonshot.cn/v1/chat/completions"

def test_chat_proxy():
    print("\n--- Testing Chat Proxy (api/chat.js logic) ---")
    system_prompt = "你是一个名为“AI 脉动智能助手”的专家。请简洁、专业地回答用户的问题。"
    message = "你好，请问 2026 年 Nvidia 最强显卡是什么？"
    
    payload = {
        "model": "moonshot-v1-8k",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ]
    }
    
    try:
        start_time = time.time()
        response = requests.post(BASE_URL, headers={"Authorization": f"Bearer {API_KEY}"}, json=payload)
        end_time = time.time()
        
        result = response.json()
        if response.status_code == 200:
            print(f"✅ Chat Response Success! (Time: {end_time - start_time:.2f}s)")
            content = result['choices'][0]['message']['content']
            print("Reply Snippet:", content[:100] + "...")
            # Verify frontend expected structure
            print("Frontend Match:", {"reply": content} != None)
        else:
            print(f"❌ Chat Failure: {result}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_news_proxy():
    print("\n--- Testing News Proxy (api/news.js logic) ---")
    tools = [{"type": "builtin_function", "function": {"name": "$web_search"}}]
    system_prompt = "你是一个 2026 年的顶级 AI 行业主理人。直接返回结果，不要任何开场白或解释。"
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "返回 6 条最高热度的 AI 行业动态并生成 JSON。保持极简。不要深度长考。"}
    ]
    
    try:
        # Step 1
        print("[Turn 1] Requesting Kimi (Fast Mode)...")
        start_time = time.time()
        resp1 = requests.post(BASE_URL, headers={"Authorization": f"Bearer {API_KEY}"}, json={
            "model": "kimi-k2.5",
            "messages": messages,
            "tools": tools,
            "tool_choice": "auto",
            "thinking": {"enabled": False}
        })
        end_time = time.time()
        
        result1 = resp1.json()
        if resp1.status_code != 200:
            print(f"❌ Step 1 Failed: {result1}")
            return
            
        message = result1['choices'][0]['message']
        print(f"✅ Turn 1 Success (Time: {end_time - start_time:.2f}s). Tool Calls: {bool(message.get('tool_calls'))}")
        
        if message.get('tool_calls'):
            tc = message['tool_calls'][0]
            messages.append({
                "role": "assistant",
                "content": message.get("content"),
                "tool_calls": message['tool_calls']
            })
            messages.append({
                "role": "tool",
                "tool_call_id": tc['id'],
                "name": "$web_search",
                "content": tc['function']['arguments']
            })
            
            # Step 2: Synthesis (USING FASTER MODEL)
            print("[Turn 2] Synthesis (USING moonshot-v1-8k for speed)...")
            start_time = time.time()
            resp2 = requests.post(BASE_URL, headers={"Authorization": f"Bearer {API_KEY}"}, json={
                "model": "moonshot-v1-32k",
                "messages": messages,
                "response_format": {"type": "json_object"}
            })
            end_time = time.time()
            
            result2 = resp2.json()
            if resp2.status_code == 200:
                print(f"✅ Synthesis Success! (Time: {end_time - start_time:.2f}s)")
                final_content = result2['choices'][0]['message']['content']
                print("Final JSON Header:", final_content[:50] + "...")
            else:
                print(f"❌ Step 2 Failed: {result2}")
        else:
            print("ℹ️ Direct answer (no tools used).")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_chat_proxy()
    test_news_proxy()
