// Core State
let AI_NEWS_DATA = { trends: [], hero: null };
let currentTopic = 'general';

// Initialize the Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Load: Check LocalStorage for instant display
    const cachedData = localStorage.getItem('ai_pulse_cache');
    if (cachedData) {
        console.log('🚀 Loading from LocalStorage Cache...');
        try {
            AI_NEWS_DATA = JSON.parse(cachedData);
            // Render immediately without animation delay for instant feel
            renderHero(false, AI_NEWS_DATA.hero, true); 
            renderTrends(false, 'all', true); 
        } catch (e) {
            console.error('Local cache corrupted');
        }
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

            // Avoid double-click of same topic
            const topic = btn.dataset.topic;
            if (topic === currentTopic) return;

            // Update UI
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            console.log(`切换专栏: ${topic}`);
            currentTopic = topic;
            fetchNewsFromKimi(null, true); // Force full reload for new topic
            
            // Scroll back to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

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

// Real-time Cyber Clock
function startLiveClock() {
    const clockEl = document.getElementById('current-date');
    if (!clockEl) return;

    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        clockEl.textContent = `${hours}:${minutes}:${seconds}`;
    }

    updateClock();
    setInterval(updateClock, 1000);
}

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
    
    const heroData = data || AI_NEWS_DATA?.hero || { title: 'AI Pulse 2026', summary: '情报引擎正在搜索中...', url: '#' };
    
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
    let filteredTrends = Array.isArray(AI_NEWS_DATA?.trends) ? [...AI_NEWS_DATA.trends] : [];
    if (filterCategory !== 'all') {
        filteredTrends = filteredTrends.filter(item => item.category === filterCategory);
    }
    
    const sortedTrends = filteredTrends.sort((a, b) => b.priority - a.priority);
    
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
        console.error('Crawl failed, showing fallback summary.');
        const originalTrend = AI_NEWS_DATA.trends.find(t => t.url === url) || AI_NEWS_DATA.hero;
        
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
    
    const hasData = AI_NEWS_DATA && AI_NEWS_DATA.trends && AI_NEWS_DATA.trends.length > 0;
    
    if (!isAppend && (!hasData || force)) {
        renderHero(true);
        renderTrends(true);
    } else if (!isAppend) {
        const statusText = document.querySelector('.status-text');
        if (statusText) statusText.textContent = '🔄 正在同步云端最新资讯...';
    }

    try {
        const seed = isAppend ? Math.floor(Math.random() * 1000) : 0;
        const url = force ? `/api/news?force=true&topic=${currentTopic}&seed=${seed}&t=${Date.now()}` : `/api/news?topic=${currentTopic}&t=${Date.now()}`;
        const response = await fetch(url);
        const dataSource = response.headers.get('x-data-source') || 'Unknown';
        const freshData = await response.json();

        if (!response.ok) throw new Error(freshData.error || 'Fetch Failed');

        updateWidgetData(freshData, dataSource, isAppend);

        if (freshData && !isAppend) {
            localStorage.setItem('ai_pulse_cache', JSON.stringify(freshData));
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

    // Update global reference
    if (isAppend) {
        // Append unique items only
        const existingTitles = new Set(AI_NEWS_DATA.trends.map(t => t.title));
        const newItems = (data.trends || []).filter(item => !existingTitles.has(item.title));
        AI_NEWS_DATA.trends = [...AI_NEWS_DATA.trends, ...newItems];
        renderTrends(false, 'all', false, true); // Append render
    } else {
        AI_NEWS_DATA = data;
        renderHero(false, data.hero);
        renderTrends(false, 'all');
    }

    // Update live status text to show source
    if (statusText) {
        if (source.includes('Cache') || source.includes('KV')) {
            statusText.innerHTML = `数据源: <span style="color: #4cd964">● 容器缓存 (Redis)</span>`;
        } else if (source.includes('Discovery') || source.includes('Kimi')) {
            statusText.innerHTML = `数据源: <span style="color: #ffcc00">● AI 实时全网发现</span>`;
        } else {
            statusText.textContent = `数据源: ${source}`;
        }
    }
}

function closeModal() {
    const modal = document.getElementById('detail-modal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

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

// Real-time clock update
function updateClock() {
    const now = new Date();
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const timeString = now.toLocaleTimeString('zh-CN', options);
    const dateString = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const clockElement = document.getElementById('real-time-clock');
    if (clockElement) {
        clockElement.textContent = `${dateString} ${timeString}`;
    }
}

// Initial call and set interval for clock
setInterval(updateClock, 1000);
updateClock(); // Call immediately to avoid delay

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
