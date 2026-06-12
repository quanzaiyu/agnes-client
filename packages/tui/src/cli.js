#!/usr/bin/env node
'use strict';

/**
 * Agnes AI TUI - Interactive terminal client
 * Usage: agnes
 */

const path = require('path');
const fs = require('fs');

// Resolve @agnes/core relative to this package
const corePath = path.resolve(__dirname, '../../core/src');
const { AgnesClient, loadConfig, saveConfig } = require(corePath);

// ESM-only packages are imported dynamically
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

// ─── Models ──────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolvePath(p) {
  if (!p) return p;
  if (path.isAbsolute(p)) return p;
  return path.resolve(process.cwd(), p);
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

// Print markdown to terminal using chalk (simple version, no full parser)
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

// ─── Config ──────────────────────────────────────────────────────────────────

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

// ─── Text Flow ───────────────────────────────────────────────────────────────

async function flowText(client, inquirer, chalk, ora) {
  const model = await inquirer.select({
    message: '选择文本模型:',
    choices: MODELS.text,
  });

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
    const question = await inquirer.input({ message: '关于这张图片，你想问什么? 例如: 描述图片内容', default: '请描述这张图片的内容。' });
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
      content: '现在几点了? 请使用工具获取当前时间。',
    });
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
    // Normal chat or thinking
    const systemPrompt = await inquirer.input({
      message: 'System Prompt (可留空):',
      default: '',
    });
    if (systemPrompt.trim()) {
      messages.push({ role: 'system', content: systemPrompt.trim() });
    }

    const userPrompt = await inquirer.input({ message: '输入你的提问:' });
    messages.push({ role: 'user', content: userPrompt });
  }

  const saveToFile = await inquirer.confirm({ message: '是否将输出保存到文件?', default: false });
  let outputPath = null;
  if (saveToFile) {
    outputPath = await inquirer.input({ message: '保存路径 (例如 ./output.md):', default: './output.md' });
    outputPath = resolvePath(outputPath);
  }

  // Determine stream
  const useStream = !saveToFile;

  const spinner = ora('正在生成...').start();

  const tools = mode === 'tools' ? [
    {
      type: 'function',
      function: {
        name: 'get_current_time',
        description: '获取当前时间',
        parameters: { type: 'object', properties: {} },
      },
    },
  ] : undefined;

  try {
    if (useStream) {
      spinner.stop();
      console.log(chalk.cyan('\n─── 生成结果 ───\n'));

      const stream = await client.chat({
        model,
        messages,
        stream: true,
        thinking: mode === 'thinking',
        tools,
      });

      let fullContent = '';
      stream.on('data', (chunk) => {
        const text = chunk.toString();
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const json = JSON.parse(line.slice(6));
              const delta = json.choices?.[0]?.delta?.content || '';
              if (delta) {
                process.stdout.write(delta);
                fullContent += delta;
              }
            } catch (_) {}
          }
        }
      });

      await new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      console.log(chalk.cyan('\n\n─── 生成完成 ───\n'));
    } else {
      const result = await client.chat({
        model,
        messages,
        thinking: mode === 'thinking',
        tools,
      });

      spinner.stop();
      const content = result.choices?.[0]?.message?.content || '';

      if (outputPath) {
        ensureDir(outputPath);
        fs.writeFileSync(outputPath, content, 'utf-8');
        console.log(chalk.green(`\n✓ 已保存到 ${outputPath}`));
      } else {
        console.log(chalk.cyan('\n─── 生成结果 ───\n'));
        await printMarkdown(content, chalk);
        console.log(chalk.cyan('\n─── 生成完成 ───\n'));
      }

      const usage = result.usage;
      if (usage) {
        console.log(chalk.gray(`Token 用量: 输入 ${usage.prompt_tokens} + 输出 ${usage.completion_tokens} = ${usage.total_tokens}`));
      }
    }
  } catch (err) {
    spinner.fail(`生成失败: ${err.message}`);
  }
}

// ─── Image Flow ──────────────────────────────────────────────────────────────

async function flowImage(client, inquirer, chalk, ora) {
  const model = await inquirer.select({
    message: '选择图像模型:',
    choices: MODELS.image,
  });

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
    const imgPath = await inquirer.input({ message: '参考图路径或 URL (本地路径将转为 Data URI):' });
    const resolved = resolvePath(imgPath);
    if (fs.existsSync(resolved)) {
      const ext = path.extname(resolved).toLowerCase().replace('.', '') || 'png';
      const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif' };
      const mime = mimeMap[ext] || 'png';
      const b64 = fs.readFileSync(resolved).toString('base64');
      inputImages.push(`data:image/${mime};base64,${b64}`);
    } else {
      inputImages.push(imgPath); // treat as URL
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
        const b64 = fs.readFileSync(resolved).toString('base64');
        inputImages.push(`data:image/${mime};base64,${b64}`);
      } else {
        inputImages.push(img.trim());
      }
    }
  }

  let size = await inquirer.select({
    message: '选择输出尺寸:',
    choices: IMAGE_SIZES,
  });

  // Custom size
  if (size === 'custom') {
    const w = await inquirer.input({ message: '输入宽度 (px):', default: '1920' });
    const h = await inquirer.input({ message: '输入高度 (px):', default: '1080' });
    size = `${parseInt(w) || 1920}x${parseInt(h) || 1080}`;
  }

  const style = await inquirer.select({
    message: '选择图像风格:',
    choices: IMAGE_STYLES,
  });

  const promptInput = await inquirer.input({ message: '输入提示词 (Prompt):' });
  const prompt = style.value ? `${promptInput}, ${style.value}` : promptInput;

  const outputPath = resolvePath(
    await inquirer.input({ message: '保存路径 (例如 ./output.jpg):', default: './output.jpg' })
  );

  const spinner = ora('正在生成图像，请稍候（可能需要 10-60 秒）...').start();

  try {
    const result = await client.generateImage({
      model,
      prompt,
      size,
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

// ─── Video Flow ───────────────────────────────────────────────────────────────

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
    const resolved = resolvePath(imgInput);
    if (fs.existsSync(resolved)) {
      // Convert local file to data URI
      const ext = path.extname(resolved).toLowerCase().replace('.', '') || 'png';
      const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif' };
      const mime = mimeMap[ext] || 'png';
      const b64 = fs.readFileSync(resolved).toString('base64');
      image = `data:image/${mime};base64,${b64}`;
    } else {
      image = imgInput; // treat as URL
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
        const b64 = fs.readFileSync(resolved).toString('base64');
        images.push(`data:image/${mime};base64,${b64}`);
      } else {
        images.push(img.trim());
      }
    }
    image = images;
  }

  // Video size
  let vidSize = await inquirer.select({
    message: '选择视频尺寸:',
    choices: VIDEO_SIZES,
  });
  if (vidSize === 'custom') {
    const c = await inquirer.input({ message: '自定义尺寸 (WxH，例如 1216x832):', default: '1216x832' });
    vidSize = c.trim() || '1216x832';
  }

  // num_frames
  let numFrames = await inquirer.select({
    message: '选择帧数 (num_frames):',
    choices: VIDEO_FRAMES,
  });
  if (numFrames === 'custom') {
    const n = await inquirer.input({ message: '自定义帧数:', default: '121' });
    numFrames = parseInt(n) || 121;
  }

  // fps
  let frameRate = await inquirer.select({
    message: '选择帧率 (FPS):',
    choices: VIDEO_FPS_OPTIONS,
  });
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

  // Parse size string "WxH" into width/height
  const [vidW, vidH] = vidSize.split('x').map(Number);

  const spinner = ora('创建视频任务...').start();

  try {
    const task = await client.createVideo({
      model,
      prompt,
      image,
      mode: mode === 'keyframes' ? 'keyframes' : undefined,
      width: vidW,
      height: vidH,
      numFrames,
      frameRate,
      negativePrompt: negativePrompt || undefined,
    });

    const videoId = task.video_id;
    spinner.text = `任务已创建 (video_id: ${videoId})，等待生成...`;

    const result = await client.waitForVideo(videoId, {
      pollInterval: 5000,
      maxWait: 600000,
      onProgress: (progress, status) => {
        spinner.text = `视频生成中... ${progress}% [${status}]`;
      },
    });

    const videoUrl = result.remixed_from_video_id; // This field holds the final video URL
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

// ─── Config Flow ─────────────────────────────────────────────────────────────

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
    const savedPath = saveConfig(newConfig, 'local');
    console.log(chalk.green(`\n✓ API Key 已更新，保存到 ${savedPath}`));
    return newConfig;
  }

  if (action === 'baseurl') {
    const baseUrl = await inquirer.input({ message: '新 Base URL:', default: config.baseUrl });
    const newConfig = { ...config, baseUrl: baseUrl.trim() };
    const savedPath = saveConfig(newConfig, 'local');
    console.log(chalk.green(`\n✓ Base URL 已更新，保存到 ${savedPath}`));
    return newConfig;
  }

  return config;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
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

    if (type === 'exit') {
      console.log(chalk.gray('\n再见！\n'));
      break;
    }

    if (type === 'config') {
      config = await flowConfig(config, inquirer, chalk);
      continue;
    }

    const client = new AgnesClient(config);

    try {
      if (type === 'text') {
        await flowText(client, inquirer, chalk, ora);
      } else if (type === 'image') {
        await flowImage(client, inquirer, chalk, ora);
      } else if (type === 'video') {
        await flowVideo(client, inquirer, chalk, ora);
      }
    } catch (err) {
      console.error(chalk.red(`\n错误: ${err.message}\n`));
    }

    const again = await inquirer.confirm({ message: '继续使用 Agnes AI?', default: true });
    if (!again) {
      console.log(chalk.gray('\n再见！\n'));
      break;
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
