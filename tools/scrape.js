/**
 * agnes-ai.com 文档爬取脚本
 *
 * 使用方式：
 *   node tools/scrape.js
 *
 * 依赖：playwright（在项目根目录 npm install 后即可使用）
 * Chromium 路径：脚本会自动寻找 playwright 自带的 Chromium，
 * 若未找到也可通过环境变量 CHROMIUM_PATH 指定。
 *
 * 输出：docs/ 目录，按章节结构归档 markdown 文件。
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://agnes-ai.com';
const OUTPUT_DIR = path.resolve(__dirname, '../docs');

const DOCS = [
  { url: '/doc/agnes-15-flash',       file: '01_模型/01_01_文本_Agnes_1.5_Flash.md',       title: 'Agnes 1.5 Flash' },
  { url: '/doc/agnes-20-flash',       file: '01_模型/01_02_文本_Agnes_2.0_Flash.md',       title: 'Agnes 2.0 Flash' },
  { url: '/doc/agnes-image-20-flash', file: '01_模型/01_03_图像_Agnes_Image_2.0_Flash.md', title: 'Agnes Image 2.0 Flash' },
  { url: '/doc/agnes-image-21-flash', file: '01_模型/01_04_图像_Agnes_Image_2.1_Flash.md', title: 'Agnes Image 2.1 Flash' },
  { url: '/doc/agnes-video-v20',      file: '01_模型/01_05_视频_Agnes_Video_V2.0.md',      title: 'Agnes Video V2.0' },
  { url: '/doc/overview',             file: '02_产品/02_01_开发者文档.md',                  title: '开发者文档' },
  { url: '/doc/privacy-policy',       file: '03_公司/03_01_隐私政策.md',                    title: '隐私政策' },
  { url: '/doc/terms-of-service',     file: '03_公司/03_02_服务条款.md',                    title: '服务条款' },
];

function extractContentAsMarkdown(html) {
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
  html = html.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');

  html = html.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n');
  html = html.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n');
  html = html.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n');
  html = html.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n');
  html = html.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n');

  html = html.replace(/<pre[^>]*><code[^>]*class="language-(\w+)"[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```$1\n$2\n```\n');
  html = html.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gis, '\n```\n$1\n```\n');
  html = html.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

  html = html.replace(/<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>/gi, '**$1**');
  html = html.replace(/<(?:em|i)[^>]*>(.*?)<\/(?:em|i)>/gi, '*$1*');

  html = html.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (match, href, text) => {
    text = text.trim();
    if (!text) return '';
    if (href.startsWith('#') || href === 'javascript:void(0)' || href === '') return text;
    if (href.startsWith('/')) return `[${text}](${BASE_URL}${href})`;
    if (href.startsWith('http')) return `[${text}](${href})`;
    return text;
  });

  html = html.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  html = html.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n');
  html = html.replace(/<br\s*\/?>/gi, '\n');
  html = html.replace(/<hr\s*\/?>/gi, '\n---\n');

  html = html.replace(/<tr[^>]*>(.*?)<\/tr>/gi, (match, content) => {
    content = content.replace(/<t[dh][^>]*>(.*?)<\/t[dh]>/gi, '| $1 ');
    return content + '|\n';
  });

  html = html.replace(/<[^>]+>/g, '');

  html = html.replace(/&amp;/g, '&');
  html = html.replace(/&lt;/g, '<');
  html = html.replace(/&gt;/g, '>');
  html = html.replace(/&quot;/g, '"');
  html = html.replace(/&#39;/g, "'");
  html = html.replace(/&nbsp;/g, ' ');
  html = html.replace(/&#x27;/g, "'");

  let lines = html.split('\n');
  let result = [];
  let prevBlank = false;

  for (let line of lines) {
    line = line.trim();
    if (line === '复制页面') continue;

    if (line === '') {
      if (!prevBlank) { result.push(''); prevBlank = true; }
    } else {
      result.push(line);
      prevBlank = false;
    }
  }

  let md = result.join('\n').trim();
  md = md.replace(/\n{3,}/g, '\n\n');

  return md;
}

async function scrapePage(page, doc) {
  const fullUrl = BASE_URL + doc.url;
  console.log(`\nFetching: ${fullUrl}`);

  await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const content = await page.evaluate(() => {
    const selectors = ['main', '.notion-page', '.notion-viewport', '[class*="doc-content"]', '[class*="article"]', '.prose', '.markdown-body'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText?.trim().length > 200) return el.outerHTML;
    }

    const body = document.body.cloneNode(true);
    ['nav', 'header', 'footer', '.sidebar', '[class*="sidebar"]', '.toc', 'script', 'style', 'noscript'].forEach(sel => {
      body.querySelectorAll(sel).forEach(el => el.remove());
    });

    const mainInBody = body.querySelector('main');
    if (mainInBody && mainInBody.innerText.trim().length > 100) return mainInBody.outerHTML;

    return body.outerHTML;
  });

  let markdown = `# ${doc.title}\n\n`;
  markdown += `> 来源: ${fullUrl}\n\n`;
  markdown += extractContentAsMarkdown(content);

  return markdown;
}

// Try to find Chromium executable
function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;

  const candidates = [
    // playwright managed (common Windows path)
    path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-*', 'chrome-win', 'chrome.exe'),
    // workbuddy managed
    path.join(process.env.USERPROFILE || '', '.workbuddy', 'binaries', 'node', 'workspace', 'browsers', 'chromium-*', 'chrome-win64', 'chrome.exe'),
  ];

  for (const pattern of candidates) {
    const dir = path.dirname(pattern);
    const base = path.basename(pattern);
    if (fs.existsSync(dir)) {
      // Try glob-like match
      const parentDir = path.dirname(dir);
      const parentBase = path.basename(dir);
      const globDir = path.dirname(parentDir);
      try {
        const siblings = fs.readdirSync(globDir || path.dirname(dir));
        for (const s of siblings) {
          const candidate = path.join(globDir || path.dirname(dir), s, base.replace('*', ''));
          if (fs.existsSync(candidate)) return candidate;
        }
      } catch (_) {}
    }
  }

  return undefined; // Let playwright find its own
}

async function main() {
  const executablePath = findChromium();
  console.log('Chromium:', executablePath || '(playwright default)');

  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ locale: 'zh-CN' });
  const page = await context.newPage();

  try {
    // Ensure output directories
    for (const doc of DOCS) {
      fs.mkdirSync(path.dirname(path.join(OUTPUT_DIR, doc.file)), { recursive: true });
    }

    for (const doc of DOCS) {
      try {
        const markdown = await scrapePage(page, doc);
        const filePath = path.join(OUTPUT_DIR, doc.file);
        fs.writeFileSync(filePath, markdown, 'utf-8');
        console.log(`Saved: ${doc.file} (${markdown.length} chars)`);
      } catch (err) {
        console.error(`Failed: ${doc.url} - ${err.message}`);
      }
    }

    console.log('\n=== Scraping complete! Run "node tools/fix-markdown.js" to post-process ===');
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
