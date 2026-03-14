// Vercel Serverless Function: Web Content Crawler
// Fetches external HTML and extracts the main article content for local reading.

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: "Missing URL parameter" });
    }

    try {
        console.log(`Crawling via Jina Reader: ${url}`);
        
        // Use r.jina.ai as a specialized reader proxy (Free & High Success Rate)
        const jinaUrl = `https://r.jina.ai/${url}`;
        
        const response = await fetch(jinaUrl, {
            headers: {
                'X-Return-Format': 'html', // Ask for HTML
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const html = await response.text();

        // Basic Content Extraction logic (Server-side)
        // Note: For a more robust production version, consider using library like 'readability' or 'cheerio'
        // For this implementation, we will perform clean-up on the frontend or simplified regex here.
        
        // Let's strip script and style tags to be safe
        const cleanHtml = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
            .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
            .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "");

        // Find the main article title (heuristically)
        const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
        const title = titleMatch ? titleMatch[1].trim() : "AI Pulse Article";

        // Return a basic "Reader Mode" JSON
        return res.status(200).json({
            title,
            content: cleanHtml,
            url
        });

    } catch (error) {
        console.error('Crawler Error:', error);
        return res.status(500).json({ 
            error: "Could not crawl the content", 
            message: error.message,
            fallback_url: url 
        });
    }
}
