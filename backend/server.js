const express = require('express');
const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const db = new sqlite3.Database('./db/crawls.db', (err) => {
    if (err) console.error('DB Error:', err);
    console.log('Connected to SQLite');
});

db.run(`
    CREATE TABLE IF NOT EXISTS crawls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT,
        emails TEXT,
        trackers TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

async function crawlDomain(startUrl, maxPages = 5) {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    const visited = new Set();
    const toVisit = [startUrl];
    const allEmails = new Set();
    const trackers = new Set();

    await page.setRequestInterception(true);
    page.on('request', request => {
        const url = request.url();
        if (url.includes('google') || url.includes('facebook') || url.includes('doubleclick')) {
            trackers.add(url);
        }
        request.continue();
    });

    while (toVisit.length && visited.size < maxPages) {
        const url = toVisit.shift();
        if (visited.has(url)) continue;

        console.log(`Crawling: ${url}`);
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            const text = await page.evaluate(() => document.body.innerText);
            const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const emails = text.match(emailPattern) || [];
            emails.forEach(email => allEmails.add(email));

            const links = await page.evaluate(() =>
                Array.from(document.querySelectorAll('a[href]'))
                    .map(a => a.href)
                    .filter(href => href.startsWith('http'))
            );
            links.forEach(link => {
                if (link.startsWith(startUrl) && !visited.has(link)) {
                    toVisit.push(link);
                }
            });
            visited.add(url);
        } catch (error) {
            console.error(`Error at ${url}:`, error);
        }
    }

    await browser.close();
    return { emails: Array.from(allEmails), trackers: Array.from(trackers) };
}

app.post('/crawl', async (req, res) => {
    const { url } = req.body;
    if (!url || !url.startsWith('http')) {
        return res.status(400).json({ error: 'Valid URL required' });
    }

    try {
        const result = await crawlDomain(url);
        const emailsJson = JSON.stringify(result.emails);
        const trackersJson = JSON.stringify(result.trackers);

        db.run(
            'INSERT INTO crawls (url, emails, trackers) VALUES (?, ?, ?)',
            [url, emailsJson, trackersJson],
            (err) => {
                if (err) console.error('DB Insert Error:', err);
            }
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Crawl failed', details: error.message });
    }
});

app.get('/crawls', (req, res) => {
    db.all('SELECT * FROM crawls ORDER BY timestamp DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB fetch failed' });
        res.json(rows.map(row => ({
            id: row.id,
            url: row.url,
            emails: JSON.parse(row.emails),
            trackers: JSON.parse(row.trackers),
            timestamp: row.timestamp
        })));
    });
});

app.get('/', (req, res) => {
    res.send('Crawler API running on port 3030');
});

const PORT = process.env.PORT || 3030;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
