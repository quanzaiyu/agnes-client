#!/usr/bin/env node
'use strict';

/**
 * Agnes AI TUI — Dual-mode entry point
 *
 *   agnes                       → Interactive TUI (menu-driven)
 *   agnes text chat --prompt ..  → Direct CLI text generation
 *   agnes image generate ...     → Direct CLI image generation
 *   agnes video create ...       → Direct CLI video generation
 *   agnes config ...             → Config management
 *   agnes --help                 → Show usage
 */

const path = require('path');
const fs = require('fs');

// Resolve @agnes/core relative to this package
const corePath = path.resolve(__dirname, '../../core/src');
const { AgnesClient, loadConfig, saveConfig } = require(corePath);

// ─── ESM-only helpers (dynamic import) ──────────────────────────────────────

async function getInquirer() {
  const { input, select, confirm, password } = await import('@inquirer/prompts');
  return { input, select, confirm, password };
}
async function getChalk() {
  const chalk = await import('chalk');
  return chalk.default;
}
async function getOra() {
  const ora = await import('ora');
  return ora.default;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MODELS = {
  text: [
    { name: 'Agnes 1.5 Flash (轻量高速，适合高并发)', value: 'agnes-1.5-flash' },
    { name: 'Agnes 2.0 Flash (推荐：智能体/工具调用/图片理解)', value: 'agnes-2.0-flash' },
  ],
  image: [
    { name: 'Agnes Image 2.0 Flash (文生图/图生图/多图合成)', value: 'agnes-image-2.0-flash' },
    { name: 'Agnes Image 2.1 Flash (升级版：高信息密度优化)', value: 'agnes-image-2.1-flash' },
  ],
  video: [
    { name: 'Agnes Video V2.0 (文生视频/图生视频/关键帧动画)', value: 'agnes-video-v2.0' },
  ],
};

const IMAGE_SIZES = [
  { name: '1024x1024 (正方形)', value: '1024x1024' },
  { name: '1024x768  (横向 4:3)', value: '1024x768' },
  { name: '768x1024  (竖向 3:4)', value: '768x1024' },
  { name: '1280x720  (宽屏 16:9)', value: '1280x720' },
  { name: '720x1280  (竖版 9:16)', value: '720x1280' },
  { name: '1920x1080 (全高清)', value: '1920x1080' },
  { name: '🖊 自定义尺寸', value: 'custom' },
];

const IMAGE_STYLES = [
  { name: '写实摄影 (Photorealistic)', value: 'photorealistic, professional photography, high detail' },
  { name: '电影感 (Cinematic)', value: 'cinematic, dramatic lighting, film grain, movie still' },
  { name: '动漫插画 (Anime)', value: 'anime style, vibrant colors, detailed illustration' },
  { name: '油画艺术 (Oil Painting)', value: 'oil painting style, brush strokes, artistic' },
  { name: '水彩插画 (Watercolor)', value: 'watercolor illustration, soft colors, artistic' },
  { name: '3D 渲染 (3D Render)', value: '3D render, CGI, octane render, high quality' },
  { name: '扁平设计 (Flat Design)', value: 'flat design, minimal, vector art, clean' },
  { name: '无风格 (不附加风格词)', value: '' },
];

const VIDEO_SIZES = [
  { name: '1216x832 (默认)', value: '1216x832' },
  { name: '1152x768', value: '1152x768' },
  { name: '1088x640 (16:9)', value: '1088x640' },
  { name: '960x576', value: '960x576' },
  { name: '🖊 自定义', value: 'custom' },
];

const VIDEO_FRAMES = [
  { name: '81 帧 (~3 秒)', value: 81 },
  { name: '121 帧 (~5 秒)', value: 121 },
  { name: '241 帧 (~10 秒)', value: 241 },
  { name: '441 帧 (~18 秒) [最长]', value: 441 },
  { name: '🖊 自定义', value: 'custom' },
];

const VIDEO_FPS_OPTIONS = [
  { name: '24 fps (标准)', value: 24 },
  { name: '30 fps', value: 30 },
  { name: '60 fps', value: 60 },
  { name: '🖊 自定义', value: 'custom' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolvePath(p) {
  if (!p) return p;
  if (path.isAbsolute(p)) return p;
  return path.resolve(process.cwd(), p);
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function fail(msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
  process.exit(1);
}

function ok(msg) {
  console.log(`\x1b[32m✓ ${msg}\x1b[0m`);
}

// Resolve an image reference (path or URL) to a data URI
async function resolveImage(img) {
  if (!img) return img;
  if (img.startsWith('data:')) return img;

  const resolved = resolvePath(img);
  if (fs.existsSync(resolved)) {
    const ext = path.extname(resolved).toLowerCase().replace('.', '') || 'png';
    const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif', bmp: 'bmp' };
    const mime = mimeMap[ext] || 'png';
    const b64 = fs.readFileSync(resolved).toString('base64');
    return `data:image/${mime};base64,${b64}`;
  }

  if (img.startsWith('http://') || img.startsWith('https://')) {
    return img; // let AgnesClient.resolveImage handle URL download
  }

  fail(`Image not found: ${img}`);
}

// Print markdown to terminal
async function printMarkdown(text, chalk) {
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      console.log(chalk.bold.cyan('\n' + line.slice(2)));
    } else if (line.startsWith('## ')) {
      console.log(chalk.bold.yellow('\n' + line.slice(3)));
    } else if (line.startsWith('### ')) {
      console.log(chalk.bold.green(line.slice(4)));
    } else if (line.startsWith('```')) {
      console.log(chalk.gray(line));
    } else if (line.startsWith('- ')) {
      console.log(chalk.white('  • ' + line.slice(2)));
    } else {
      console.log(line);
    }
  }
}

// ─── Argument Parser ────────────────────────────────────────────────────────

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  const params = {};

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg === '--' || arg === '-') {
      // Everything after -- is positional
      positional.push(...argv.slice(arg === '--' ? i + 1 : i));
      break;
    }

    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        // --key=value
        const key = arg.slice(2, eqIdx);
        const value = arg.slice(eqIdx + 1);
        addParam(params, key, value);
        i++;
      } else {
        const key = arg.slice(2);
        if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
          addParam(params, key, argv[i + 1]);
          i += 2;
        } else {
          flags[key] = true;
          i++;
        }
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      // -h style shorthand
      const key = arg.slice(1);
      if (key === 'h') { flags.help = true; flags.h = true; }
      flags[key] = true;
      i++;
    } else {
      positional.push(arg);
      i++;
    }
  }

  return { positional, flags, params };
}

function addParam(params, key, value) {
  key = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); // kebab → camel

  if (params[key] !== undefined) {
    // Support multiple values
    if (Array.isArray(params[key])) {
      params[key].push(value);
    } else {
      params[key] = [params[key], value];
    }
  } else {
    params[key] = value;
  }
}

// ─── Help ───────────────────────────────────────────────────────────────────

const USAGE = `
Agnes AI — Terminal Client

Usage:
  agnes                                    Interactive TUI mode
  agnes text chat [options]                Text generation
  agnes image generate [options]           Image generation
  agnes video create [options]             Video generation
  agnes config [action]                    Config management
  agnes --help                             Show this help

Text generation:
  agnes text chat --prompt <text> [--system <text>] [--model <id>]
                   [--image <url>]        Vision mode (image understanding)
                   [--thinking]           Enable thinking mode
                   [--tools]              Enable tool calling demo
                   [--summary]            Read from stdin for summarization
                   [--no-stream]          Disable streaming output
                   [--output <path>]      Save output to file

Image generation:
  agnes image generate --prompt <text> [--model <id>]
                   [--size <WxH>]         1024x1024, 1920x1080, etc.
                   [--style <name>]       photorealistic, anime, cinematic, etc.
                   [--image <path|url>]   Reference image (repeatable for multi)
                   [--output <path>]      Save image to file (default: ./output.jpg)

Video generation:
  agnes video create --prompt <text> [--model <id>]
                   [--size <WxH>]        1216x832, 1152x768, 1088x640, 960x576
                   [--frames <n>]        81, 121, 241, 441
                   [--fps <n>]           24, 30, 60
                   [--image <path|url>]  Reference image for img2vid
                   [--mode keyframes]    Keyframe animation mode
                   [--negative-prompt <text>]
                   [--output <path>]     Save video to file (default: ./output.mp4)

Config:
  agnes config view                       Show current config
  agnes config set-apikey <key>           Set API key
  agnes config set-baseurl <url>          Set base URL

Examples:
  agnes
  agnes text chat --prompt "Hello, who are you?"
  agnes text chat --prompt "Describe this image" --image https://example.com/photo.jpg
  agnes text chat --prompt "Summarize:" --summary --output ./summary.md
  agnes image generate --prompt "A cat in a garden" --size 1920x1080
  agnes image generate --prompt "Enhance this photo" --image ./input.png
  agnes video create --prompt "A sunset over the ocean" --size 1216x832 --frames 121
  agnes video create --prompt "Animate this image" --image ./photo.jpg
  agnes config set-apikey sk-xxx
`;

function showHelp() {
  console.log(USAGE);
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI Mode Handlers
// ═══════════════════════════════════════════════════════════════════════════

async function cliTextChat(params, flags) {
  const prompt = params.prompt;
  if (!prompt) fail('Missing required option: --prompt <text>');

  const config = loadConfig();
  if (!config.apiKey) fail('No API key configured. Run: agnes config set-apikey <key>');

  const client = new AgnesClient(config);

  const mode = flags.summary ? 'summary'
    : params.image ? 'vision'
    : flags.tools ? 'tools'
    : 'chat';

  const messages = [];

  if (mode === 'summary') {
    // Read from stdin
    const chunks = [];
    process.stdin.setEncoding('utf-8');
    for await (const chunk of process.stdin) chunks.push(chunk);
    const content = chunks.join('');
    if (!content.trim()) fail('No input provided on stdin for --summary');
    messages.push(
      { role: 'system', content: '你是一个专业的文档摘要助手，提供清晰、结构化的摘要。' },
      { role: 'user', content: `请对以下内容进行摘要：\n\n${content}` }
    );
  } else if (mode === 'vision') {
    const imageUrl = params.image;
    const question = prompt || '请描述这张图片的内容。';
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: question },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    });
  } else if (mode === 'tools') {
    messages.push({
      role: 'user',
      content: prompt,
    });
  } else {
    if (params.system) messages.push({ role: 'system', content: params.system });
    messages.push({ role: 'user', content: prompt });
  }

  const model = params.model || MODELS.text[1].value;
  const useStream = !flags['noStream'] && !flags.stream && !params.output;
  const thinking = flags.thinking || false;
  const tools = mode === 'tools'
    ? [{ type: 'function', function: { name: 'get_current_time', description: '获取当前时间', parameters: { type: 'object', properties: {} } } }]
    : undefined;

  if (useStream) {
    console.log('\x1b[36m─── 生成结果 ───\x1b[0m\n');
    const stream = await client.chat({ model, messages, stream: true, thinking, tools });

    let fullContent = '';
    stream.on('data', (chunk) => {
      const text = chunk.toString();
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const json = JSON.parse(line.slice(6));
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) { process.stdout.write(delta); fullContent += delta; }
          } catch (_) {}
        }
      }
    });

    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    console.log('\x1b[36m\n─── 生成完成 ───\x1b[0m\n');

    if (params.output) {
      ensureDir(resolvePath(params.output));
      fs.writeFileSync(resolvePath(params.output), fullContent, 'utf-8');
      ok(`Saved to ${params.output}`);
    }
  } else {
    process.stderr.write('Generating...\n');
    const result = await client.chat({ model, messages, thinking, tools });
    const content = result.choices?.[0]?.message?.content || '';

    if (params.output) {
      ensureDir(resolvePath(params.output));
      fs.writeFileSync(resolvePath(params.output), content, 'utf-8');
      ok(`Saved to ${params.output}`);
    } else {
      console.log('\x1b[36m─── 生成结果 ───\x1b[0m\n');
      console.log(content);
      console.log('\x1b[36m─── 生成完成 ───\x1b[0m\n');
    }

    const usage = result.usage;
    if (usage) {
      console.log(`\x1b[90mToken: in=${usage.prompt_tokens} out=${usage.completion_tokens} total=${usage.total_tokens}\x1b[0m`);
    }
  }
}

async function cliImageGenerate(params, flags) {
  const prompt = params.prompt;
  if (!prompt) fail('Missing required option: --prompt <text>');

  const config = loadConfig();
  if (!config.apiKey) fail('No API key configured. Run: agnes config set-apikey <key>');

  const client = new AgnesClient(config);

  // Model
  const model = params.model || MODELS.image[1].value;

  // Size
  const size = params.size || '1024x1024';
  if (!/^\d+x\d+$/i.test(size)) fail(`Invalid size "${size}". Use WxH format, e.g. 1024x1024`);

  // Style
  let finalPrompt = prompt;
  if (params.style) {
    // Match style by name or use raw
    const found = IMAGE_STYLES.find(s =>
      s.name.toLowerCase().includes(params.style.toLowerCase()) ||
      s.value.toLowerCase().includes(params.style.toLowerCase())
    );
    if (found && found.value) {
      finalPrompt = `${prompt}, ${found.value}`;
    } else {
      // Treat as raw style string
      finalPrompt = `${prompt}, ${params.style}`;
    }
  }

  // Reference images
  let images = undefined;
  if (params.image) {
    images = Array.isArray(params.image) ? params.image : [params.image];
  }

  // Output
  const outputPath = resolvePath(params.output || `./output.jpg`);

  process.stderr.write('Generating image (may take 10-60s)...\n');
  const start = Date.now();

  try {
    const result = await client.generateImage({
      model,
      prompt: finalPrompt,
      size,
      images: images && images.length > 0 ? images : undefined,
      responseFormat: 'url',
    });

    const imageUrl = result.data?.[0]?.url;
    const b64 = result.data?.[0]?.b64_json;

    if (imageUrl) {
      process.stderr.write('Downloading...\n');
      await AgnesClient.downloadFile(imageUrl, outputPath);
      ok(`Image saved to ${outputPath} (${(Date.now() - start) / 1000}s)`);
      console.log(`URL: ${imageUrl}`);
    } else if (b64) {
      AgnesClient.saveBase64Image(b64, outputPath);
      ok(`Image saved to ${outputPath} (${(Date.now() - start) / 1000}s)`);
    } else {
      fail('No image data returned');
    }
  } catch (err) {
    fail(`Image generation failed: ${err.message}`);
  }
}

async function cliVideoCreate(params, flags) {
  const prompt = params.prompt;
  if (!prompt) fail('Missing required option: --prompt <text>');

  const config = loadConfig();
  if (!config.apiKey) fail('No API key configured. Run: agnes config set-apikey <key>');

  const client = new AgnesClient(config);

  const model = params.model || MODELS.video[0].value;

  // Size
  const sizeStr = params.size || '1216x832';
  const sizeMatch = sizeStr.match(/^(\d+)x(\d+)$/i);
  if (!sizeMatch) fail(`Invalid size "${sizeStr}". Use WxH format, e.g. 1216x832`);
  const width = parseInt(sizeMatch[1]);
  const height = parseInt(sizeMatch[2]);

  // Frames & FPS
  const numFrames = parseInt(params.frames || params.numFrames) || 121;
  const frameRate = parseInt(params.fps || params.frameRate) || 24;

  // Image
  let image = params.image || undefined;
  let mode = params.mode || undefined;

  // Output
  const outputPath = resolvePath(params.output || `./output.mp4`);

  process.stderr.write('Creating video task...\n');

  try {
    const task = await client.createVideo({
      model,
      prompt,
      image,
      mode,
      width,
      height,
      numFrames,
      frameRate,
      negativePrompt: params.negativePrompt || params.negative_prompt || undefined,
    });

    const videoId = task.video_id;
    console.log(`Video task created: ${videoId}`);

    process.stderr.write(`Waiting for completion (video_id: ${videoId})...\n`);
    let lastProgress = -1;

    const result = await client.waitForVideo(videoId, {
      pollInterval: 5000,
      maxWait: 600000,
      onProgress: (progress, status) => {
        if (progress !== lastProgress) {
          process.stderr.write(`  Progress: ${progress}% [${status}]\n`);
          lastProgress = progress;
        }
      },
    });

    const videoUrl = result.remixed_from_video_id;
    if (videoUrl && videoUrl.startsWith('http')) {
      process.stderr.write('Downloading video...\n');
      await AgnesClient.downloadFile(videoUrl, outputPath);
      ok(`Video saved to ${outputPath}`);
      console.log(`URL: ${videoUrl}`);
    } else {
      ok(`Video generated: ${videoUrl || '(unknown URL)'}`);
    }
  } catch (err) {
    fail(`Video generation failed: ${err.message}`);
  }
}

async function cliConfig(action, params) {
  let config = loadConfig();

  if (!action || action === 'view') {
    console.log('\n\x1b[36mCurrent config:\x1b[0m');
    console.log(`  API Key:  ${config.apiKey ? '***' + config.apiKey.slice(-4) : '(not set)'}`);
    console.log(`  Base URL: ${config.baseUrl}`);
    console.log('');
    return;
  }

  if (action === 'set-apikey' || action === 'setApiKey') {
    const key = typeof params === 'string' ? params : params?.apikey || params?.apiKey;
    if (!key) fail('Usage: agnes config set-apikey <key>');
    config = { ...config, apiKey: key };
    saveConfig(config, 'local');
    ok(`API Key saved`);
    return;
  }

  if (action === 'set-baseurl' || action === 'setBaseUrl') {
    const url = typeof params === 'string' ? params : params?.baseurl || params?.baseUrl;
    if (!url) fail('Usage: agnes config set-baseurl <url>');
    config = { ...config, baseUrl: url };
    saveConfig(config, 'local');
    ok(`Base URL set to: ${url}`);
    return;
  }

  fail(`Unknown config action: ${action}. Use view, set-apikey, or set-baseurl.`);
}

// ═══════════════════════════════════════════════════════════════════════════
// TUI Mode (original interactive flows)
// ═══════════════════════════════════════════════════════════════════════════

async function ensureApiKey(config, inquirer, chalk) {
  if (config.apiKey && config.apiKey.trim()) return config;

  console.log(chalk.yellow('\n⚠ 未设置 API Key\n'));
  const apiKey = await inquirer.password({
    message: '请输入 Agnes AI API Key (输入后保存到本地配置文件):',
    mask: '*',
  });

  if (!apiKey.trim()) {
    console.log(chalk.red('API Key 不能为空，退出。'));
    process.exit(1);
  }

  const newConfig = { ...config, apiKey: apiKey.trim() };
  const savedPath = saveConfig(newConfig, 'local');
  console.log(chalk.green(`\n✓ API Key 已保存到 ${savedPath}\n`));
  return newConfig;
}

async function flowText(client, inquirer, chalk, ora) {
  const model = await inquirer.select({ message: '选择文本模型:', choices: MODELS.text });

  const mode = await inquirer.select({
    message: '选择模式:',
    choices: [
      { name: '💬 对话 / 文本生成', value: 'chat' },
      { name: '🖼 图片理解 (输入图片 URL + 问题)', value: 'vision' },
      { name: '🔧 工具调用示例 (内置 get_time 演示)', value: 'tools' },
      { name: '🧠 开启 Thinking 模式', value: 'thinking' },
      { name: '📝 文档摘要 (粘贴文本进行摘要)', value: 'summary' },
    ],
  });

  const messages = [];

  if (mode === 'vision') {
    const imageUrl = await inquirer.input({ message: '图片 URL:' });
    const question = await inquirer.input({
      message: '关于这张图片，你想问什么?',
      default: '请描述这张图片的内容。',
    });
    messages.push({ role: 'user', content: [{ type: 'text', text: question }, { type: 'image_url', image_url: { url: imageUrl } }] });
  } else if (mode === 'tools') {
    messages.push({ role: 'user', content: '现在几点了? 请使用工具获取当前时间。' });
  } else if (mode === 'summary') {
    console.log(chalk.gray('粘贴要摘要的文本，输入完成后新行输入 "END" 并回车:'));
    const lines = [];
    const rl = require('readline').createInterface({ input: process.stdin, terminal: false });
    for await (const line of rl) {
      if (line.trim() === 'END') break;
      lines.push(line);
    }
    messages.push(
      { role: 'system', content: '你是一个专业的文档摘要助手，提供清晰、结构化的摘要。' },
      { role: 'user', content: `请对以下内容进行摘要：\n\n${lines.join('\n')}` }
    );
  } else {
    const systemPrompt = await inquirer.input({ message: 'System Prompt (可留空):', default: '' });
    if (systemPrompt.trim()) messages.push({ role: 'system', content: systemPrompt.trim() });
    const userPrompt = await inquirer.input({ message: '输入你的提问:' });
    messages.push({ role: 'user', content: userPrompt });
  }

  const saveToFile = await inquirer.confirm({ message: '是否将输出保存到文件?', default: false });
  let outputPath = null;
  if (saveToFile) {
    outputPath = await inquirer.input({ message: '保存路径 (例如 ./output.md):', default: './output.md' });
    outputPath = resolvePath(outputPath);
  }

  const tools = mode === 'tools'
    ? [{ type: 'function', function: { name: 'get_current_time', description: '获取当前时间', parameters: { type: 'object', properties: {} } } }]
    : undefined;

  const spinner = ora('正在生成...').start();
  try {
    if (!saveToFile) {
      spinner.stop();
      console.log(chalk.cyan('\n─── 生成结果 ───\n'));
      const stream = await client.chat({ model, messages, stream: true, thinking: mode === 'thinking', tools });
      let fullContent = '';
      stream.on('data', (chunk) => {
        const text = chunk.toString();
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || '';
              if (delta) { process.stdout.write(delta); fullContent += delta; }
            } catch (_) {}
          }
        }
      });
      await new Promise((resolve, reject) => { stream.on('end', resolve); stream.on('error', reject); });
      console.log(chalk.cyan('\n\n─── 生成完成 ───\n'));
    } else {
      const result = await client.chat({ model, messages, thinking: mode === 'thinking', tools });
      spinner.stop();
      const content = result.choices?.[0]?.message?.content || '';
      ensureDir(outputPath);
      fs.writeFileSync(outputPath, content, 'utf-8');
      console.log(chalk.green(`\n✓ 已保存到 ${outputPath}`));
      const usage = result.usage;
      if (usage) console.log(chalk.gray(`Token 用量: 输入 ${usage.prompt_tokens} + 输出 ${usage.completion_tokens} = ${usage.total_tokens}`));
    }
  } catch (err) {
    spinner.fail(`生成失败: ${err.message}`);
  }
}

async function flowImage(client, inquirer, chalk, ora) {
  const model = await inquirer.select({ message: '选择图像模型:', choices: MODELS.image });

  const mode = await inquirer.select({
    message: '选择模式:',
    choices: [
      { name: '✏️  文生图 (Text to Image)', value: 'text2img' },
      { name: '🖼 图生图 (Image to Image)', value: 'img2img' },
      { name: '🎭 多图合成 (Multi-Image Synthesis)', value: 'multi' },
    ],
  });

  let inputImages = [];

  if (mode === 'img2img') {
    const imgPath = await inquirer.input({ message: '参考图路径或 URL:' });
    if (imgPath.trim()) {
      const resolved = resolvePath(imgPath.trim());
      if (fs.existsSync(resolved)) {
        const ext = path.extname(resolved).toLowerCase().replace('.', '') || 'png';
        const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif' };
        const mime = mimeMap[ext] || 'png';
        inputImages.push(`data:image/${mime};base64,${fs.readFileSync(resolved).toString('base64')}`);
      } else {
        inputImages.push(imgPath.trim());
      }
    }
  } else if (mode === 'multi') {
    console.log(chalk.gray('逐个输入参考图路径或 URL，留空结束输入:'));
    while (true) {
      const img = await inquirer.input({ message: `参考图 ${inputImages.length + 1} (留空结束):`, default: '' });
      if (!img.trim()) break;
      const resolved = resolvePath(img.trim());
      if (fs.existsSync(resolved)) {
        const ext = path.extname(resolved).toLowerCase().replace('.', '') || 'png';
        const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp' };
        const mime = mimeMap[ext] || 'png';
        inputImages.push(`data:image/${mime};base64,${fs.readFileSync(resolved).toString('base64')}`);
      } else {
        inputImages.push(img.trim());
      }
    }
  }

  let size = await inquirer.select({ message: '选择输出尺寸:', choices: IMAGE_SIZES });
  if (size === 'custom') {
    const w = await inquirer.input({ message: '输入宽度 (px):', default: '1920' });
    const h = await inquirer.input({ message: '输入高度 (px):', default: '1080' });
    size = `${parseInt(w) || 1920}x${parseInt(h) || 1080}`;
  }

  const style = await inquirer.select({ message: '选择图像风格:', choices: IMAGE_STYLES });
  const promptInput = await inquirer.input({ message: '输入提示词 (Prompt):' });
  const prompt = style.value ? `${promptInput}, ${style.value}` : promptInput;

  const outputPath = resolvePath(
    await inquirer.input({ message: '保存路径 (例如 ./output.jpg):', default: './output.jpg' })
  );

  const spinner = ora('正在生成图像，请稍候（可能需要 10-60 秒）...').start();
  try {
    const result = await client.generateImage({
      model, prompt, size,
      images: inputImages.length > 0 ? inputImages : undefined,
      responseFormat: 'url',
    });
    const imageUrl = result.data?.[0]?.url;
    const b64 = result.data?.[0]?.b64_json;
    if (imageUrl) {
      spinner.text = '下载图像中...';
      await AgnesClient.downloadFile(imageUrl, outputPath);
      spinner.succeed(`图像已保存到 ${outputPath}`);
      console.log(chalk.gray(`图像 URL: ${imageUrl}`));
    } else if (b64) {
      AgnesClient.saveBase64Image(b64, outputPath);
      spinner.succeed(`图像已保存到 ${outputPath}`);
    } else {
      spinner.fail('未获取到图像数据');
    }
  } catch (err) {
    spinner.fail(`图像生成失败: ${err.message}`);
  }
}

async function flowVideo(client, inquirer, chalk, ora) {
  const model = MODELS.video[0].value;

  const mode = await inquirer.select({
    message: '选择模式:',
    choices: [
      { name: '📝 文生视频 (Text to Video)', value: 'text2vid' },
      { name: '🖼 图生视频 (Image to Video)', value: 'img2vid' },
      { name: '🎬 多图视频 (Multi-Image Video)', value: 'multi' },
      { name: '🎞 关键帧动画 (Keyframe Animation)', value: 'keyframes' },
    ],
  });

  let image = undefined;

  if (mode === 'img2vid') {
    const imgInput = await inquirer.input({ message: '参考图路径或 URL:' });
    if (imgInput.trim()) {
      const resolved = resolvePath(imgInput.trim());
      if (fs.existsSync(resolved)) {
        const ext = path.extname(resolved).toLowerCase().replace('.', '') || 'png';
        const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif' };
        const mime = mimeMap[ext] || 'png';
        image = `data:image/${mime};base64,${fs.readFileSync(resolved).toString('base64')}`;
      } else {
        image = imgInput.trim();
      }
    }
  } else if (mode === 'multi' || mode === 'keyframes') {
    const images = [];
    console.log(chalk.gray('逐个输入图片路径或 URL，留空结束:'));
    while (true) {
      const img = await inquirer.input({ message: `图片 ${images.length + 1} (留空结束):`, default: '' });
      if (!img.trim()) break;
      const resolved = resolvePath(img.trim());
      if (fs.existsSync(resolved)) {
        const ext = path.extname(resolved).toLowerCase().replace('.', '') || 'png';
        const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif' };
        const mime = mimeMap[ext] || 'png';
        images.push(`data:image/${mime};base64,${fs.readFileSync(resolved).toString('base64')}`);
      } else {
        images.push(img.trim());
      }
    }
    image = images;
  }

  let vidSize = await inquirer.select({ message: '选择视频尺寸:', choices: VIDEO_SIZES });
  if (vidSize === 'custom') {
    const c = await inquirer.input({ message: '自定义尺寸 (WxH，例如 1216x832):', default: '1216x832' });
    vidSize = c.trim() || '1216x832';
  }

  let numFrames = await inquirer.select({ message: '选择帧数 (num_frames):', choices: VIDEO_FRAMES });
  if (numFrames === 'custom') {
    const n = await inquirer.input({ message: '自定义帧数:', default: '121' });
    numFrames = parseInt(n) || 121;
  }

  let frameRate = await inquirer.select({ message: '选择帧率 (FPS):', choices: VIDEO_FPS_OPTIONS });
  if (frameRate === 'custom') {
    const f = await inquirer.input({ message: '自定义 FPS:', default: '24' });
    frameRate = parseInt(f) || 24;
  }

  const prompt = await inquirer.input({ message: '输入视频描述 (Prompt):' });

  const negativePrompt = await inquirer.input({
    message: '负向提示词 (可留空，描述不希望出现的内容):',
    default: '',
  });

  const outputPath = resolvePath(
    await inquirer.input({ message: '保存路径 (例如 ./output.mp4):', default: './output.mp4' })
  );

  const [vidW, vidH] = vidSize.split('x').map(Number);
  const spinner = ora('创建视频任务...').start();

  try {
    const task = await client.createVideo({
      model, prompt, image,
      mode: mode === 'keyframes' ? 'keyframes' : undefined,
      width: vidW, height: vidH,
      numFrames, frameRate,
      negativePrompt: negativePrompt || undefined,
    });
    const videoId = task.video_id;
    spinner.text = `任务已创建 (video_id: ${videoId})，等待生成...`;

    const result = await client.waitForVideo(videoId, {
      pollInterval: 5000, maxWait: 600000,
      onProgress: (progress, status) => { spinner.text = `视频生成中... ${progress}% [${status}]`; },
    });

    const videoUrl = result.remixed_from_video_id;
    if (videoUrl && videoUrl.startsWith('http')) {
      spinner.text = '下载视频中...';
      await AgnesClient.downloadFile(videoUrl, outputPath);
      spinner.succeed(`视频已保存到 ${outputPath}`);
      console.log(chalk.gray(`视频 URL: ${videoUrl}`));
    } else {
      spinner.succeed(`视频生成完成，URL: ${videoUrl}`);
    }
  } catch (err) {
    spinner.fail(`视频生成失败: ${err.message}`);
  }
}

async function flowConfig(config, inquirer, chalk) {
  const action = await inquirer.select({
    message: '配置管理:',
    choices: [
      { name: '查看当前配置', value: 'view' },
      { name: '修改 API Key', value: 'apikey' },
      { name: '修改 Base URL', value: 'baseurl' },
    ],
  });

  if (action === 'view') {
    console.log(chalk.cyan('\n当前配置:'));
    console.log(`  API Key: ${config.apiKey ? '***' + config.apiKey.slice(-4) : '(未设置)'}`);
    console.log(`  Base URL: ${config.baseUrl}`);
    return config;
  }
  if (action === 'apikey') {
    const apiKey = await inquirer.password({ message: '新 API Key:', mask: '*' });
    const newConfig = { ...config, apiKey: apiKey.trim() };
    saveConfig(newConfig, 'local');
    console.log(chalk.green(`\n✓ API Key 已更新`));
    return newConfig;
  }
  if (action === 'baseurl') {
    const baseUrl = await inquirer.input({ message: '新 Base URL:', default: config.baseUrl });
    const newConfig = { ...config, baseUrl: baseUrl.trim() };
    saveConfig(newConfig, 'local');
    console.log(chalk.green(`\n✓ Base URL 已更新`));
    return newConfig;
  }
  return config;
}

async function runTUI() {
  const [inquirer, chalk, ora] = await Promise.all([getInquirer(), getChalk(), getOra()]);

  console.log(chalk.bold.cyan('\n┌─────────────────────────────────────┐'));
  console.log(chalk.bold.cyan('│      Agnes AI  •  Terminal Client   │'));
  console.log(chalk.bold.cyan('└─────────────────────────────────────┘\n'));

  let config = loadConfig();
  config = await ensureApiKey(config, inquirer, chalk);

  while (true) {
    const type = await inquirer.select({
      message: '选择生成方式:',
      choices: [
        { name: '💬 文本 / 对话', value: 'text' },
        { name: '🎨 图像生成', value: 'image' },
        { name: '🎬 视频生成', value: 'video' },
        { name: '⚙️  配置管理', value: 'config' },
        { name: '🚪 退出', value: 'exit' },
      ],
    });
    if (type === 'exit') { console.log(chalk.gray('\n再见！\n')); break; }
    if (type === 'config') { config = await flowConfig(config, inquirer, chalk); continue; }

    const client = new AgnesClient(config);
    try {
      if (type === 'text') await flowText(client, inquirer, chalk, ora);
      else if (type === 'image') await flowImage(client, inquirer, chalk, ora);
      else if (type === 'video') await flowVideo(client, inquirer, chalk, ora);
    } catch (err) {
      console.error(chalk.red(`\n错误: ${err.message}\n`));
    }
    const again = await inquirer.confirm({ message: '继续使用 Agnes AI?', default: true });
    if (!again) { console.log(chalk.gray('\n再见！\n')); break; }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main — Dispatch between TUI and CLI mode
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  // No arguments → TUI mode
  if (args.length === 0) {
    return runTUI();
  }

  const { positional, flags, params } = parseArgs(args);

  // Help
  if (flags.help || flags.h) {
    showHelp();
    return;
  }

  // Dispatch
  const category = positional[0];
  const action = positional[1];

  if (!category) {
    showHelp();
    return;
  }

  try {
    if (category === 'text') {
      await cliTextChat(params, flags);
    } else if (category === 'image') {
      await cliImageGenerate(params, flags);
    } else if (category === 'video') {
      await cliVideoCreate(params, flags);
    } else if (category === 'config') {
      await cliConfig(action, params);
    } else {
      console.error(`\x1b[31mUnknown command: ${category}\x1b[0m`);
      showHelp();
      process.exit(1);
    }
  } catch (err) {
    console.error(`\x1b[31mError: ${err.message}\x1b[0m`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
