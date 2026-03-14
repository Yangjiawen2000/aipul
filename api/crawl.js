// Vercel Serverless Function: Web Content Crawler
// Fetches external HTML and extracts the main article content for local reading.

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: "Missing URL parameter" });
    }

    try {
        console.log(`Crawling: ${url}`);
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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
