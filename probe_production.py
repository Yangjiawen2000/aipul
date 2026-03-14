import requests
import time

PROD_URL = "https://aipul.vercel.app/api/news"

def check_prod_status():
    print(f"--- Probing Production: {PROD_URL} ---")
    try:
        # 1. Check current state
        start = time.time()
        resp = requests.get(PROD_URL)
        end = time.time()
        
        source = resp.headers.get('x-data-source', 'Unknown')
        print(f"Status: {resp.status_code}")
        print(f"Data Source: {source}")
        print(f"Response Time: {end - start:.2f}s")
        
        if source == 'Vercel-KV-Cache':
            print("✅ Container State: FULL (Serving from Redis)")
        else:
            print("⚠️  Container State: STALE/EMPTY (Freshly discovered)")

        # 2. Inform about manual fill
        print("\n--- Manual Trigger Logic ---")
        print(f"To manually fill the container, visit: {PROD_URL}?force=true")
        print("This will bypass cache, trigger AI discovery, and refill Redis.")

    except Exception as e:
        print(f"Error probing production: {e}")

if __name__ == "__main__":
    check_prod_status()
