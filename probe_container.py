import requests
import json

PROD_URL = "https://aipul.vercel.app/api/news"

def probe_container():
    print(f"--- Probing Production Container: {PROD_URL} ---")
    try:
        # Standard fetch (should hit Redis)
        resp = requests.get(PROD_URL)
        source = resp.headers.get('x-data-source', 'Unknown')
        debug_cache = resp.headers.get('x-debug-cache', 'N/A')
        debug_update = resp.headers.get('x-debug-cache-update', 'N/A')
        
        print(f"HTTP Status: {resp.status_code}")
        print(f"Data Source: {source}")
        print(f"Debug Cache: {debug_cache}")
        print(f"Debug Update: {debug_update}")
        
        if resp.status_code == 200:
            data = resp.json()
            print("\n--- Container Contents ---")
            print(f"Hero Title: {data.get('hero', {}).get('title', 'N/A')}")
            print(f"Trends Count: {len(data.get('trends', []))}")
            for i, t in enumerate(data.get('trends', [])):
                print(f"  [{i+1}] {t.get('title')}")
        else:
            print(f"Error Response: {resp.text}")

    except Exception as e:
        print(f"Probe Error: {e}")

if __name__ == "__main__":
    probe_container()
