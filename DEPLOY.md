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
5. **访问**：
   - 部署完成后，该网址即可公开访问，且由你的 Key 提供动力。

## 方案 B: GitHub Pages (免费且经典)

1. 在 GitHub 仓库设置中找到 **Settings**。
2. 在左侧菜单中点击 **Pages**。
3. 在 **Build and deployment** 部分，选择 **Deploy from a branch**。
4. 选择 `main` 分支并保存。
5. 几分钟后，你的站点将上线于 `https://<your-username>.github.io/<repo-name>/`。

## 关于 API Key 的安全策略

目前该项目默认采用 **"Bring Your Own Key" (BYOK)** 模式：
- **优点**：部署成本为 0，且你不需要为其他人的查询付费。
- **缺点**：每个用户初次使用时都需要输入自己的 Kimi API Key（保存在他们的浏览器 LocalStorage 中）。

### 如果你想让别人“开箱即用”：
如果你希望他人访问时直接看到内容（由你支付 API 费用），则需要：
1. **隐藏 Key**：设置一个简单的后端（如 Vercel Functions）。
2. **流量控制**：需要通过后端代理 Kimi 请求，防止 API 额度被滥用。
*注：如果你需要实现此模式，请随时告知我。*

---
祝你的 AI 洞察平台早日上线！
