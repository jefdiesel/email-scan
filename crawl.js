const puppeteer = require('puppeteer');

async function fetchEmails(url) {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    try {
        // Navigate to the page
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Extract text content from rendered page
        const text = await page.evaluate(() => document.body.innerText);

        // Regex to find emails
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = new Set(text.match(emailPattern) || []);

        await browser.close();
        return emails;
    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        await browser.close();
        return new Set();
    }
}

// Test it
(async () => {
    const url = 'https://example.com';
    const emails = await fetchEmails(url);
    console.log('Found emails:', Array.from(emails));
})();
