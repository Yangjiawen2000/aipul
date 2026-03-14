// Mock Data for AI Frontiers 2025 (Expanded to 9 items)
const AI_NEWS_DATA = {
    hero: {
        title: "GPT-5 'Orion' 内部预览：推理能力指数级跃迁",
        summary: "OpenAI 下一代模型在慢思考（System 2）上取得重大突破，标志着迈向通用人工智能（AGI）的关键里程碑。",
        category: "大语言模型",
        time: "10 mins ago",
        url: "https://openai.com"
    },
    trends: [
        { id: 1, category: "机器人", title: "Figure 03 发布：搭载具身智能 2.0", summary: "新型仿人机器人展示了极自然的物体操纵能力，感知大幅增强。", impact: "重大影响", priority: 9, url: "https://figure.ai" },
        { id: 2, category: "算力芯片", title: "NVIDIA Blackwell B200 正式交付", summary: "全球云服务器厂商开始部署最新 GPU，算力较前代提升数倍。", impact: "核心突破", priority: 10, url: "https://nvidia.com" },
        { id: 3, category: "多模态", title: "Sora 2.0 开启定向邀测", summary: "新版解决物理模拟难题，视频连贯性达到电影级。", impact: "显著进步", priority: 7, url: "https://openai.com/sora" },
        { id: 4, category: "大模型", title: "Llama 4 性能解析：对标商业顶尖", summary: "Meta 内测开源模型性能已完全对标商业闭源模型。", impact: "重大影响", priority: 8, url: "https://meta.ai" },
        { id: 5, category: "其他", title: "AlphaFold 3 预测蛋白质全复合体", summary: "新药研发筛选时间从数月缩短至数天，生物计算大飞跃。", impact: "重大影响", priority: 8, url: "https://deepmind.google" },
        { id: 6, category: "智驾", title: "FSD V13 开启全自动驾驶新纪元", summary: "全新端到端模型实现了在复杂城区环境下的零干预驾驶。", impact: "显著进步", priority: 8, url: "https://tesla.com" },
        { id: 7, category: "算力芯片", title: "谷歌量子处理器实现千比特纠缠", summary: "纠错能力首次超越物理衰减，大规模量子计算初现曙光。", impact: "核心突破", priority: 9, url: "https://quantum.google" },
        { id: 8, category: "其他", title: "Neuralink 完成第二例人体植入", summary: "患者成功通过意念操控外部设备，响应速度提升 40%。", impact: "重大影响", priority: 7, url: "https://neuralink.com" },
        { id: 9, category: "安全治理", title: "全球签署《AI 治理公约》", summary: "100 余国达成共识，建立联合审查机制，确保 AI 安全可控。", impact: "重大影响", priority: 6, url: "https://un.org" }
    ]
};

// Initialize the Dashboard
document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    checkApiConnectivity();
    animateOnScroll();
    initChat();
    
    // Disable right-click for a more native "app" feel
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Modal Close logic
    const closeModalBtn = document.getElementById('close-modal');
    const modalOverlay = document.getElementById('detail-modal');
    
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Refresh Button logic
    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.classList.add('refresh-btn-anim');
            fetchNewsFromKimi(); // Call without key to use backend proxy
            setTimeout(() => refreshBtn.classList.remove('refresh-btn-anim'), 800);
        });
    }

    // Category Filter logic
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const category = btn.getAttribute('data-category');
            renderTrends(false, category);
        });
    });

    // Auto-refresh every 30 minutes
    setInterval(() => {
        checkApiConnectivity();
    }, 30 * 60 * 1000);
});

// Check if Backend API is available
async function checkApiConnectivity() {
    const statusEl = document.getElementById('connectivity-status');
    if (!statusEl) return;

    try {
        const response = await fetch('/api/news', { method: 'HEAD' });
        if (response.ok) {
            console.log('✅ Connectivity Check Success: Backend is reachable.');
            statusEl.textContent = '☁️ 云端同步';
            statusEl.className = 'connectivity-status cloud';
            fetchNewsFromKimi(); // Load real data
        } else {
            console.error('❌ Connectivity Check Failed: Backend returned error status', response.status);
            throw new Error('Backend unreachable');
        }
    } catch (error) {
        console.warn('⚠️ Connectivity Check Error:', error.message);
        statusEl.textContent = '🏠 本地模式 (模拟数据)';
        statusEl.className = 'connectivity-status local';
        // Fallback to mock data
        renderHero();
        renderTrends();
    }
}

// Chat History
let chatHistory = [];

function initChat() {
    const chatToggle = document.getElementById('chat-toggle');
    const chatWindow = document.getElementById('chat-window');
    const closeChat = document.getElementById('close-chat');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat');

    if (chatToggle) {
        chatToggle.addEventListener('click', () => {
            chatWindow.classList.toggle('active');
        });
    }

    if (closeChat) {
        closeChat.addEventListener('click', () => {
            chatWindow.classList.remove('active');
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const container = document.getElementById('chat-messages');
    const text = input.value.trim();

    if (!text) return;

    // Add user message
    addChatMessage('user', text);
    input.value = '';

    // Add loading indicator
    const loadingId = 'msg-' + Date.now();
    addChatMessage('system', '正在思考...', loadingId);

    try {
        // Send to backend proxy
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: chatHistory })
        });

        const result = await response.json();
        
        // Remove loading message
        document.getElementById(loadingId)?.remove();

        if (response.ok) {
            addChatMessage('system', result.reply);
            chatHistory.push({ role: "user", content: text });
            chatHistory.push({ role: "assistant", content: result.reply });
            // Limit history
            if (chatHistory.length > 10) chatHistory.splice(0, 2);
        } else {
            addChatMessage('system', '抱歉，我现在连不上大脑了（API 错误）。如果你正在本地预览，请部署到 Vercel 后再试。');
        }
    } catch (error) {
        document.getElementById(loadingId)?.remove();
        addChatMessage('system', '网络连接由于本地环境限制失败。请确保项目已部署至云端环境。');
    }
}

function addChatMessage(role, content, id = null) {
    const container = document.getElementById('chat-messages');
    const msg = document.createElement('div');
    msg.className = `message ${role}`;
    if (id) msg.id = id;
    msg.textContent = content;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

// Update Current Date
function updateDate() {
    const now = new Date();
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const dateStr = now.toLocaleDateString('zh-CN', options).replace(/\//g, '.');
    
    document.getElementById('current-date').textContent = dateStr;
}

// Render Hero Section
function renderHero(isLoading = false) {
    const heroContent = document.querySelector('.hero-card');
    const heroTitle = document.getElementById('hero-title');
    const heroSummary = document.getElementById('hero-summary');
    const heroLink = document.getElementById('hero-link');
    
    if (isLoading) {
        heroContent.classList.add('hero-skeleton');
        return;
    }

    heroContent.classList.remove('hero-skeleton');
    
    // Smooth transition
    heroTitle.style.opacity = '0';
    heroSummary.style.opacity = '0';
    if (heroLink) heroLink.style.opacity = '0';
    
    setTimeout(() => {
        heroTitle.textContent = AI_NEWS_DATA.hero.title;
        heroSummary.textContent = AI_NEWS_DATA.hero.summary;
        
        if (heroLink) {
            heroLink.onclick = () => window.open(AI_NEWS_DATA.hero.url, '_blank');
            heroLink.style.opacity = '1';
        }
        
        heroTitle.style.opacity = '1';
        heroSummary.style.opacity = '1';
    }, 300);
}

// Render Trends Grid with Skeleton & Filter Support
function renderTrends(isLoading = false, filterCategory = 'all') {
    const grid = document.getElementById('trends-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (isLoading) {
        // ... (skeleton logic remains same)
        for (let i = 0; i < 9; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'glass-card trend-card skeleton-loading';
            skeleton.innerHTML = `
                <div class="trend-meta">
                    <span class="category">█████</span>
                    <span class="impact-tag">███</span>
                </div>
                <h3 class="trend-title">████████████</h3>
                <p class="trend-summary">██████████████████████████████</p>
                <div class="card-footer">
                    <span class="priority-indicator">████</span>
                    <div class="source-btn">🔗 ████</div>
                </div>
            `;
            grid.appendChild(skeleton);
        }
        return;
    }

    // Filter and Sort by priority descending
    let filteredTrends = [...AI_NEWS_DATA.trends];
    if (filterCategory !== 'all') {
        filteredTrends = filteredTrends.filter(item => item.category === filterCategory);
    }
    
    const sortedTrends = filteredTrends.sort((a, b) => b.priority - a.priority);
    
    if (sortedTrends.length === 0) {
        grid.innerHTML = '<p class="no-results">该分类下暂无最新动态</p>';
        return;
    }

    sortedTrends.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'glass-card trend-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        card.innerHTML = `
            <div class="trend-meta">
                <span class="category">${item.category}</span>
                <span class="impact-tag tag-${getImpactClass(item.impact)}">${item.impact}</span>
            </div>
            <h3 class="trend-title">${item.title}</h3>
            <p class="trend-summary">${item.summary}</p>
            <div class="card-footer">
                <span class="priority-indicator">热度指数: ${item.priority}</span>
                <a href="${item.url}" target="_blank" class="source-btn" onclick="event.stopPropagation()">
                    <span class="source-icon">🔗</span> 查看原文
                </a>
            </div>
        `;
        
        // Add click listener for modal
        card.addEventListener('click', () => {
            openModal(item);
        });
        
        grid.appendChild(card);
    });
}

// Modal Logic
function openModal(data) {
    const modal = document.getElementById('detail-modal');
    const modalCategory = document.getElementById('modal-category');
    const modalImpact = document.getElementById('modal-impact');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalPriority = document.getElementById('modal-priority');
    const modalFooter = modal.querySelector('.modal-footer') || document.createElement('div');
    
    modalCategory.textContent = data.category;
    modalImpact.textContent = data.impact;
    modalImpact.className = `impact-tag tag-${getImpactClass(data.impact)}`;
    modalTitle.textContent = data.title;
    modalBody.innerHTML = `<div class="article-loading">正在为您抓取深度内容...</div>`;
    modalPriority.textContent = data.priority;
    
    // Update Source Link in Modal
    if (!modal.querySelector('.modal-footer')) {
        modalFooter.className = 'modal-footer';
        modal.querySelector('.modal-content').appendChild(modalFooter);
    }
    modalFooter.innerHTML = `
        <a href="${data.url}" target="_blank" class="source-btn" style="width: 100%; justify-content: center; margin-top: 1.5rem; font-size: 0.9rem; opacity: 0.7;">
            阅读网页原文 <span class="source-icon">→</span>
        </a>
    `;
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);

    // Trigger Crawler
    fetchArticleContent(data.url, modalBody);
}

// Crawler Fetch Logic
async function fetchArticleContent(url, container) {
    try {
        const response = await fetch(`/api/crawl?url=${encodeURIComponent(url)}`);
        const result = await response.json();

        if (response.ok) {
            // Reader Mode Rendering
            container.innerHTML = `
                <div class="reader-mode-content">
                    ${cleanCrawledContent(result.content)}
                </div>
            `;
        } else {
            throw new Error('Crawl failed');
        }
    } catch (error) {
        container.innerHTML = `
            <div class="crawl-error">
                <p>抱歉，该网页开启了防爬设置，无法直接在该页面阅读。</p>
                <div class="p-summary">${AI_NEWS_DATA.trends.find(t => t.url === url)?.summary || ''}</div>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 1rem;">提示：您可以点击下方的“阅读网页原文”去查看。</p>
            </div>
        `;
    }
}

function cleanCrawledContent(html) {
    // Basic heuristics to find the most "content-looking" part of the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove known noise
    const noiseSelectors = 'script, style, nav, footer, header, ads, .ads, .sidebar, #comments';
    doc.querySelectorAll(noiseSelectors).forEach(el => el.remove());

    // Try to find the article body (heuristically)
    const content = doc.querySelector('article') || doc.querySelector('.article-content') || doc.querySelector('main') || doc.querySelector('.content') || doc.body;
    
    // Clean up images - ensure they don't break layout
    content.querySelectorAll('img').forEach(img => {
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = '8px';
        img.style.marginTop = '1rem';
    });

    return content.innerHTML;
}

// Helper to map Chinese impact to CSS classes
function getImpactClass(impact) {
    if (impact.includes('核心') || impact.includes('Critical')) return 'critical';
    if (impact.includes('重大') || impact.includes('High')) return 'high';
    return 'medium';
}

// Kimi API Integration (Now via Backend Proxy)
async function fetchNewsFromKimi(apiKey) {
    console.log('AI Analyst is working...');
    
    // Show Loading state
    renderHero(true);
    renderTrends(true);

    try {
        let response;
        
        // If no apiKey is provided via parameter, try the public proxy endpoint
        if (!apiKey) {
            console.log('Using Backend Proxy...');
            response = await fetch('/api/news');
        } else {
            // Original Direct Mode (for local debugging or private use)
            console.log('Using Direct Key Mode...');
            const systemPrompt = `你是一个拥有全球视野的自主 AI 行业分析师... (Prompt Refinement inside Function)`; 
            // Note: Keeping direct mode as fallback for local dev
            response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "moonshot-v1-8k",
                    messages: [
                        { role: "system", content: "你是一个专业的 AI 行业分析师。请以 JSON 格式输出 9 条最新的 AI 动态。" },
                        { role: "user", content: "请提供最新的 AI 行业动态。" }
                    ],
                    temperature: 0.3
                })
            });
        }

        const result = await response.json();
        
        if (!response.ok) {
            console.error('❌ AI Fetch Logic Error:', result);
            throw new Error(result.error || 'Fetch Failed');
        }

        const dataSource = response.headers.get('x-data-source');
        if (dataSource) {
            console.log(`📊 Data Source: ${dataSource}`);
            const missReason = response.headers.get('x-cache-miss-reason');
            if (missReason) console.log(`ℹ️ Cache Miss Reason: ${missReason}`);
        }

        // Handle both proxy direct JSON and Moonshot direct format
        let freshData = result.choices ? JSON.parse(result.choices[0].message.content.match(/\{[\s\S]*\}/)[0]) : result;
        
        updateWidgetData(freshData);
    } catch (error) {
        console.error('Data Fetch Error:', error);
        // Fallback to mock data if something breaks
        renderHero();
        renderTrends();
    }
}

function updateWidgetData(newData) {
    // Update global object
    AI_NEWS_DATA.hero = newData.hero;
    AI_NEWS_DATA.trends = newData.trends;
    
    // Re-render UI
    renderHero();
    renderTrends();
    updateDate();
    
    console.log('Pulse data updated at:', new Date().toLocaleTimeString());
}

function closeModal() {
    const modal = document.getElementById('detail-modal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Simple Intersection Observer for scroll animations
function animateOnScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.glass-card').forEach(card => {
        observer.observe(card);
    });
}
