# AI Pulse 2025: 部署与上线指南

## 第一步：将代码上传到 GitHub

在部署到 Vercel 之前，你需要先将本地代码托管到 GitHub。

### 方法 A：使用命令行 (推荐)
打开终端，进入你的项目目录 `/Users/yangjiawen/Desktop/ai-pulse-2025`，依次输入：

```bash
# 1. 初始化 Git 仓库
git init

# 2. 添加所有文件
git add .

# 3. 提交更改
git commit -m "Initial commit: Web App with Backend Proxy"

# 4. 在 GitHub (github.com) 上新建一个仓库，复制其 HTTPS 链接
# 5. 关联并推送到 GitHub (替换下方的 <链接>)
git remote add origin <你的仓库链接>
git branch -M main
git push -u origin main
```

### 方法 B：使用 GitHub Desktop (最简单)
1. 下载并安装 [GitHub Desktop](https://desktop.github.com/)。
2. 点击 **File** -> **Add Local Repository**，选择你的项目文件夹。
3. 点击 **Publish Repository**，按照提示完成上传。

---

## 第二步：部署到 Vercel (公网访问)

Vercel 是目前托管前端网页最流行且最简单的平台。

1. **准备 GitHub 仓库**：
   - 将你的代码上传到 GitHub。
2. **连接 Vercel**：
   - 访问 [Vercel 官网](https://vercel.com/) 并注册。
   - 点击 **Add New** -> **Project**，导入你的 GitHub 仓库。
3. **配置环境变量 (关键)**：
   - 在部署前的 **Environment Variables** 选项卡中。
   - 添加 `KIMI_API_KEY`，值为你的 Kimi API 密钥。
4. **一键部署**：
   - 无需配置 Framework Preset（选择 Other 即可）。
   - 点击 **Deploy**。
## 第三步：配置数据库 (最稳定方案：直连 Upstash)

如果 Vercel 的 Marketplace 里找不到 KV 或 Upstash，直接去官网创建一个即可。这是最稳妥的方法。

1. **创建 Upstash 账户**：
   - 访问 [Upstash 官网](https://upstash.com/) 并使用 GitHub 登录。
2. **创建 Redis 数据库**：
   - 点击 **"Create Database"**。
   - 名称设为 `ai-pulse-kv`，地区选离你近的（如 Hong Kong）。
   - 选择 **"Free Tier"**。
3. **获取密钥**：
   - 在数据库详情页找到 **"REST API"** 部分。
   - 复制 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN` 的值。
4. **填入 Vercel**：
   - 进入 Vercel 控制台 -> **Settings** -> **Environment Variables**。
   - 分别添加这两个变量名及对应的值。
5. **重新部署**：
   - 回到 **"Deployments"**，点击最近一次部署的三个点 `...` -> **"Redeploy"**。
6. **成功验证**：
   - 刷新网页，顶部显示 **“☁️ 云端同步”** 且资讯加载变为秒开，即表示绑定成功。

## 方案 B: GitHub Pages (免费且经典)

1. 在 GitHub 仓库设置中找到 **Settings**。
2. 在左侧菜单中点击 **Pages**。
3. 在 **Build and deployment** 部分，选择 **Deploy from a branch**。
4. 选择 `main` 分支并保存。
5. 几分钟后，你的站点将上线于 `https://<your-username>.github.io/<repo-name>/`。

## 方案 C: 本地测试真实 API (Vercel Dev)

由于本项目使用了后端代理，直接双击 `index.html` 打开无法运行后端逻辑。如果你想在本地测试真实的 AI 功能：

1.  **安装 Vercel CLI**:
    ```bash
    npm install -g vercel
    ```
2.  **启动本地开发服务器**:
    在项目目录下运行：
    ```bash
    vercel dev
    ```
3.  **配置环境**:
    它会提示你登录并关联项目。之后你可以在本地创建一个 `.env` 文件并填入 `KIMI_API_KEY=你的密钥`。
4.  **访问**:
    通过 `http://localhost:3000` 访问，此时你会发现顶部的状态变为了 **“☁️ 云端同步”**，且 AI 助手可以正常对话。

---

## 关于 API Key 的安全策略 (当前状态)
目前该项目已演进为 **“后端代理模式”**：
- **安全性**：你的 API Key 现在托管在服务器环境变量中，**不会泄露**给前端访问者。
- **自动诊断**：网页顶部的仪表盘会自动检测连接状态：
    - **🏠 本地模式**：未连接到后端，显示模拟数据。
    - **☁️ 云端同步**：已连通后端，正在调用真实的 Kimi API。

---
祝你的 AI 洞察平台早日上线！
