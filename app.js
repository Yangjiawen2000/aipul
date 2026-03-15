const INITIAL_BOOTSTRAP_DATA = {
    general: {
        hero: { title: "AI 脉动：2026 前沿视界", summary: "情报引擎已就绪，正在为您深度扫描全球 AI 动态...", url: "#", category: "官方公告", time: "刚刚" },
        trends: [
            { title: "Kimi k2.5 皇冠模型震撼发布", summary: "具备超强推理能力与多模态搜索，深度改变 AI 探索体验。", category: "模型动态", impact: "核心", priority: 99, url: "https://www.moonshot.cn/", time: "刚刚" },
            { title: "Agentic Thinking: 思考模式成为标配", summary: "大模型不再仅仅是对话，而是具备深度复盘与工具调用的思考者。", category: "技术趋势", impact: "重大", priority: 95, url: "#", time: "刚刚" },
            { title: "全球 AI 监管政策进入深水区", summary: "各国纷纷出台相关法律，平衡创新与风险，重塑行业格局。", category: "行业政策", impact: "中等", priority: 85, url: "#", time: "1小时前" }
        ]
    },
    biomed: {
        hero: { title: "AI + 生物医学：生命科学的新纪元", summary: "正在检索顶级期刊 Nature/Science 的最新科研论文...", url: "#", category: "科研动态", time: "更新中" },
        trends: [
            { title: "AlphaFold 3 开源社区活跃度激增", summary: "生物学家利用 AI 预测蛋白质复合物，加速药物研发进程。", category: "蛋白质科学", impact: "重大", priority: 98, url: "#", time: "刚刚" },
            { title: "AI 驱动的癌症免疫疗法取得突破", summary: "个性化疫苗设计速度提升10倍，临床试验反馈积极。", category: "新药研发", impact: "核心", priority: 96, url: "#", time: "刚刚" }
        ]
    },
    tools: {
        hero: { title: "AI 工具箱：释放你的生产力", summary: "正在搜寻 Cursor、Windsurf 及最新智能 Agent 工具...", url: "#", category: "效率工具", time: "更新中" },
        trends: [
            { title: "Cursor 0.45 版本：代码智能再升级", summary: "更深度的上下文理解，支持多模型联合推理，重塑 Coding 流程。", category: "开发者工具", impact: "核心", priority: 97, url: "#", time: "刚刚" },
            { title: "视频生成工具 Sora/Luma 进入大规模内测", summary: "影视行业迎来变革，AI 生成内容质量逼近专业水准。", category: "创意工具", impact: "重大", priority: 92, url: "#", time: "刚刚" }
        ]
    }
};

let AI_NEWS_DATA = JSON.parse(JSON.stringify(INITIAL_BOOTSTRAP_DATA));
let currentTopic = 'general';

// Initialize the Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Load: Check LocalStorage for all topics
    const topics = ['general', 'biomed', 'tools'];
    topics.forEach(t => {
        const cached = localStorage.getItem(`ai_pulse_cache_${t}`);
        if (cached) {
            try {
                AI_NEWS_DATA[t] = JSON.parse(cached);
            } catch (e) {
                console.error(`Cache corrupted for ${t}`);
            }
        }
    });

    // Render current topic immediately
    const initialData = AI_NEWS_DATA[currentTopic];
    if (initialData && initialData.hero) {
        renderHero(false, initialData.hero, true);
        renderTrends(false, 'all', true);
    }

    // 2. Connectivity check -> Triggers selective backend fetch
    checkApiConnectivity();
    animateOnScroll();
    initChat();
    setupInfiniteScroll();
    startLiveClock();

    // Category/Topic Filters (Three Specialized Columns)
    const filterContainer = document.getElementById('category-filters');
    if (filterContainer) {
        filterContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;

            const topic = btn.dataset.topic;
            if (topic === currentTopic) return;

            // Update UI
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            console.log(`切换专栏: ${topic}`);
            currentTopic = topic;

            // Instant Switch: Check if we have local data for this topic
            const topicData = AI_NEWS_DATA[currentTopic];
            if (topicData && topicData.hero) {
                renderHero(false, topicData.hero, true);
                renderTrends(false, 'all', true);
            } else {
                // If no data, show a quiet loading state
                document.getElementById('trends-grid').innerHTML = '<div class="loading-ripple"></div>';
            }

            // Sync with Cloud-Buffer in background (non-force unless empty)
            fetchNewsFromKimi(null, !topicData.hero); 
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Modal Close Fixes
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    // Close on background click
    const modalOverlay = document.getElementById('detail-modal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }

    // Bulletproof: Global Escape key listener
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            // Also close chat if active
            const chatWindow = document.getElementById('chat-window');
            if (chatWindow) chatWindow.classList.remove('active');
        }
    });

    // Auto-refresh every 30 minutes
    setInterval(() => {
        fetchNewsFromKimi();
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

// Redundant clock removed in favor of single implementation at bottom

// Render Hero Section
function renderHero(isLoading = false, data = null, instant = false) {
    const heroContent = document.querySelector('.hero-card');
    const heroTitle = document.getElementById('hero-title');
    const heroSummary = document.getElementById('hero-summary');
    const heroLink = document.getElementById('hero-link');
    
    if (isLoading) {
        heroContent.classList.add('hero-skeleton');
        return;
    }

    heroContent.classList.remove('hero-skeleton');
    
    const topicData = AI_NEWS_DATA[currentTopic] || { hero: null };
    const heroData = data || topicData.hero || { title: 'AI Pulse 2026', summary: '情报引擎正在搜索中...', url: '#' };
    
    if (instant) {
        heroTitle.textContent = heroData.title;
        heroSummary.textContent = heroData.summary;
        if (heroLink) heroLink.onclick = () => window.open(heroData.url, '_blank');
        return;
    }

    // Smooth transition
    heroTitle.style.opacity = '0';
    heroSummary.style.opacity = '0';
    
    setTimeout(() => {
        heroTitle.textContent = heroData.title;
        heroSummary.textContent = heroData.summary;
        if (heroLink) heroLink.onclick = () => window.open(heroData.url, '_blank');
        heroTitle.style.opacity = '1';
        heroSummary.style.opacity = '1';
    }, 300);
}

// Helper function to create a trend card element
function createTrendCard(item, index, instant = false) {
    const card = document.createElement('div');
    card.className = 'glass-card trend-card';
    if (!instant) { // Only apply animation delay if not instant
        card.style.animationDelay = `${index * 0.1}s`;
    }
    
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
    return card;
}

// Render Trends Grid with Skeleton & Filter Support
function renderTrends(isLoading = false, filterCategory = 'all', instant = false, isAppend = false) {
    const grid = document.getElementById('trends-grid');
    if (!grid) return;
    
    if (isLoading && !isAppend) {
        grid.innerHTML = '';
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
    const topicData = AI_NEWS_DATA[currentTopic] || { trends: [] };
    let filteredTrends = Array.isArray(topicData.trends) ? [...topicData.trends] : [];
    
    // Sort by priority descending
    const sortedTrends = filteredTrends.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    if (sortedTrends.length === 0 && !isAppend) {
        grid.innerHTML = '<p class="no-results">该分类下暂无最新动态</p>';
        return;
    }

    if (isAppend) {
        // Find items that are not already in the DOM to avoid duplication
        const currentTitles = new Set([...grid.querySelectorAll('.trend-title')].map(el => el.textContent));
        const itemsToAppend = sortedTrends.filter(item => !currentTitles.has(item.title));
        
        itemsToAppend.forEach((item, index) => {
            grid.appendChild(createTrendCard(item, index, false));
        });
        return;
    }

    if (instant) {
        grid.innerHTML = '';
        sortedTrends.forEach((item, index) => grid.appendChild(createTrendCard(item, index, true)));
        return;
    }

    // Direct render: individual card animations (CSS card-entry) handle the reveal
    grid.innerHTML = '';
    sortedTrends.forEach((item, index) => grid.appendChild(createTrendCard(item, index, false)));
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
    
    // Update Source Link in Modal (without overwriting priority)
    let sourceLink = modal.querySelector('.modal-source-link');
    if (!sourceLink) {
        sourceLink = document.createElement('div');
        sourceLink.className = 'modal-source-link';
        modalFooter.appendChild(sourceLink);
    }
    
    sourceLink.innerHTML = `
        <a href="${data.url}" target="_blank" class="source-btn" style="width: 100%; justify-content: center; margin-top: 1.5rem; font-size: 0.9rem; opacity: 0.7;">
            阅读网页原文 <span class="source-icon">→</span>
        </a>
    `;
    
    modal.classList.add('active');

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
        console.error('Crawl failed, showing fallback summary.');
        const topicData = AI_NEWS_DATA[currentTopic];
        const originalTrend = topicData.trends.find(t => t.url === url) || topicData.hero;
        
        container.innerHTML = `
            <div class="crawl-error-modern">
                <div class="error-glass">
                    <p class="error-msg">⚠️ 此来源受限，已切换至“AI 摘要模式”</p>
                    <div class="fallback-content">
                        ${originalTrend.summary}
                    </div>
                </div>
            </div>
        `;
    }
}

function cleanCrawledContent(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove unwanted elements
    const noiseSelectors = 'script, style, nav, footer, header, ads, .ads, .sidebar, #comments, .comments, iframe, .social-share';
    doc.querySelectorAll(noiseSelectors).forEach(el => el.remove());

    // Try to find the most meaningful content block
    let content = doc.querySelector('article') || 
                  doc.querySelector('.article-content') || 
                  doc.querySelector('.post-content') ||
                  doc.querySelector('main') || 
                  doc.querySelector('#content') ||
                  doc.body;
    
    // If it's the body, try one more time for deep nested main content
    if (content === doc.body && doc.querySelector('div[id*="content"], div[class*="content"]')) {
        content = doc.querySelector('div[id*="content"], div[class*="content"]');
    }

    // Modern clean-up for standard tags
    content.querySelectorAll('p, h1, h2, h3, h4, li, blockquote').forEach(el => {
        el.style.all = 'revert'; // Reset any inline styles from original site
    });

    return content.innerHTML;
}

// Helper to map Chinese impact to CSS classes
function getImpactClass(impact) {
    if (!impact) return 'medium';
    const str = String(impact);
    if (str.includes('核心') || str.includes('Critical')) return 'critical';
    if (str.includes('重大') || str.includes('High')) return 'high';
    return 'medium';
}

// Kimi API Integration (Now via Backend Proxy)
async function fetchNewsFromKimi(apiKey, force = false, isAppend = false) {
    
    // Correct topic-aware check
    const topicData = AI_NEWS_DATA[currentTopic];
    const hasData = topicData && topicData.trends && topicData.trends.length > 0;
    
    // Important: Force check and data existence check must be rigorous
    // If not appending, and we explicitly force OR we have no data at all (broken state)
    if (!isAppend && (force || !hasData)) {
        renderHero(true);
        renderTrends(true);
    } else if (!isAppend) {
        const statusText = document.querySelector('.status-text');
        if (statusText) statusText.textContent = `🔄 正在同步 [${currentTopic}] 最新动态...`;
    }

    try {
        const seed = isAppend ? Math.floor(Math.random() * 1000) : 0;
        const url = force ? `/api/news?force=true&topic=${currentTopic}&seed=${seed}&t=${Date.now()}` : `/api/news?topic=${currentTopic}&t=${Date.now()}`;
        const response = await fetch(url);
        const dataSource = response.headers.get('x-data-source') || 'Unknown';
        const freshData = await response.json();

        if (!response.ok) {
            console.error('[API/ERROR] Detail:', freshData);
            throw new Error(freshData.message || freshData.error || 'Fetch Failed');
        }

        updateWidgetData(freshData, dataSource, isAppend);

        if (freshData && !isAppend) {
            localStorage.setItem(`ai_pulse_cache_${currentTopic}`, JSON.stringify(freshData));
        }
    } catch (error) {
        console.error('Data Fetch Error:', error);
        if (!isAppend) updateWidgetData(null, 'Error');
    }
}

function updateWidgetData(data, source = 'AI-Discovery', isAppend = false) {
    const statusText = document.querySelector('.status-text');
    
    if (!data) {
        if (!isAppend && statusText) {
            statusText.textContent = `系统状态: 数据获取延迟`;
        }
        return;
    }

    // Update global reference for the current topic
    if (isAppend) {
        // Append unique items only
        const existingTitles = new Set(AI_NEWS_DATA[currentTopic].trends.map(t => t.title));
        const newItems = (data.trends || []).filter(item => !existingTitles.has(item.title));
        AI_NEWS_DATA[currentTopic].trends = [...AI_NEWS_DATA[currentTopic].trends, ...newItems];
        renderTrends(false, 'all', false, true); // Append render
    } else {
        AI_NEWS_DATA[currentTopic] = data;
        renderHero(false, data.hero);
        renderTrends(false, 'all');
    }

    // Update live status text to show source
    if (statusText) {
        if (source.includes('Cache') || source.includes('KV') || source.includes('Cloud')) {
            statusText.innerHTML = `数据源: <span style="color: #4cd964">● 云端高速缓存 (Redis)</span>`;
        } else if (source.includes('Discovery') || source.includes('Kimi')) {
            statusText.innerHTML = `数据源: <span style="color: #ffcc00">● AI 实时全网发现</span>`;
        } else {
            statusText.textContent = `数据源: ${source}`;
        }
    }
}

function closeModal() {
    console.log('🔔 closeModal triggered');
    const modal = document.getElementById('detail-modal');
    if (!modal) return;
    
    modal.classList.remove('active');
    
    // Safety: Reset body scroll locking if we added it (future proof)
    document.body.style.overflow = '';
    
    // Clean up content after transition
    setTimeout(() => {
        // Double check if still not active after transition
        if (!modal.classList.contains('active')) {
            const modalBody = document.getElementById('modal-body');
            if (modalBody) modalBody.innerHTML = '';
            modal.scrollTop = 0; 
            console.log('✅ Modal cleanup complete');
        }
    }, 450);
}
// Export to global scope for inline onclick support
window.closeModal = closeModal;

// UI Overhaul Helpers
function startLiveClock() {
    const clockEl = document.getElementById('current-date');
    if (!clockEl) return;
    function tick() {
        const now = new Date();
        const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        clockEl.textContent = now.toLocaleTimeString('zh-CN', options);
    }
    tick();
    setInterval(tick, 1000);
}

// Infinite Scroll Logic
let isFetchingMore = false;
function setupInfiniteScroll() {
    const sentinel = document.getElementById('scroll-sentinel');
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isFetchingMore) {
            sentinel.classList.add('visible');
            loadMoreNews();
        }
    }, { threshold: 0.1 });

    observer.observe(sentinel);
}

async function loadMoreNews() {
    if (isFetchingMore) return;
    isFetchingMore = true;
    
    // Fetch 6 new items (force true to bypass cache for "new" feeling)
    await fetchNewsFromKimi(null, true, true);
    
    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) sentinel.classList.remove('visible');
    isFetchingMore = false;
}


// Live Clock Update Logic
function updateClock() {
    const now = new Date();
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const timeString = now.toLocaleTimeString('zh-CN', options);
    
    // Both header and specialized clock elements
    ['current-date', 'real-time-clock'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = timeString;
    });
}
setInterval(updateClock, 1000);
updateClock();

// Intersection Observer for scroll animations
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
