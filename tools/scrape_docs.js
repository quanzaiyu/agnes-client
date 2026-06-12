const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://agnes-ai.com';
const DOC_URL = 'https://agnes-ai.com/doc';
const OUTPUT_DIR = path.join(__dirname, 'docs');

async function scrapeDocs() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: '/c/Users/quanz/.workbuddy/binaries/node/workspace/browsers/chromium-1223/chrome-win64/chrome.exe'
	});

	const context = await browser.newContext();
	const page = await context.newPage();

	try {
		console.log('Opening documentation page...');
		await page.goto(DOC_URL, { waitUntil: 'networkidle', timeout: 30000 });

		// Wait for sidebar to render
		await page.waitForTimeout(3000);

		// Get the page content for debugging
		const content = await page.content();
		fs.writeFileSync(path.join(__dirname, 'page_debug.html'), content);
		console.log('Debug HTML saved to page_debug.html');

		// Try to extract sidebar navigation links
		const sidebarLinks = await page.evaluate(() => {
			const links = [];

			// Common doc site patterns - look for nav/sidebar links
			const selectors = [
				'nav a', 'aside a', '.sidebar a', '.doc-sidebar a',
				'[class*="sidebar"] a', '[class*="Sidebar"] a',
				'[class*="nav"] a', '[class*="Nav"] a',
				'.menu a', '[role="navigation"] a',
				'a[href*="/doc"]'
			];

			const seen = new Set();

			for (const selector of selectors) {
				document.querySelectorAll(selector).forEach(a => {
					const href = a.getAttribute('href');
					const text = a.textContent.trim();
					if (href && text && !seen.has(href) && href !== '#') {
						// Check if it's a doc link
						if (href.startsWith('/doc') || href.includes('/doc')) {
							seen.add(href);
							links.push({ href, text });
						}
					}
				});
			}

			return links;
		});

		console.log('Sidebar links found:', JSON.stringify(sidebarLinks, null, 2));

		// Also try to extract the page title and structure
		const title = await page.title();
		console.log('Page title:', title);

		// Try to extract from any embedded data
		const allLinks = await page.evaluate(() => {
			const links = [];
			document.querySelectorAll('a').forEach(a => {
				const href = a.getAttribute('href');
				const text = a.textContent.trim();
				if (href && text) {
					links.push({ href, text });
				}
			});
			return links;
		});

		console.log('All links on page:');
		allLinks.filter(l => l.href.includes('/doc')).forEach(l => {
			console.log(`  ${l.text} -> ${l.href}`);
		});

		if (sidebarLinks.length === 0 && allLinks.filter(l => l.href.includes('/doc')).length === 0) {
			console.log('No doc links found. Page might need more time to render or uses a different structure.');
			console.log('Page text excerpt:', (await page.evaluate(() => document.body.innerText)).substring(0, 1000));
		}

	} catch (err) {
		console.error('Error:', err.message);
	} finally {
		await browser.close();
	}
}

scrapeDocs().catch(console.error);
