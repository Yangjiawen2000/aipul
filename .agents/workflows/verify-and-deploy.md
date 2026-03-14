---
description: How to verify and deploy the Kimi k2.5 Elite project
---

This workflow ensures that every code change is tested against the Kimi API before being pushed to production. This prevents Vercel timeouts and Kimi protocol errors.

### 1. Verification Step
Before committing any changes to the backend or API logic, run the automated test suite.

// turbo
```bash
python3 test_all_proxies.py
```

### 2. Validation Criteria
- **Chat Response**: Must be < 5 seconds and return a valid JSON reply.
- **News Turn 1 (Search)**: Must successfully trigger `$web_search`.
- **News Turn 2 (Synthesis)**: Must complete in < 10 seconds to avoid Vercel Hobby timeouts.

### 3. Deployment Step
Only if the verification step passes, commit and push the changes.

// turbo
```bash
git add .
git commit -m "feat: verified update following Hybrid-Elite 32k protocol"
git push
```

### 4. Continuous Integration
Always update the `test_all_proxies.py` if the message history structure or model parameters change.
