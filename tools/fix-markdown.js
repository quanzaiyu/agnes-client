/**
 * Markdown 格式修复脚本
 *
 * 对 docs/ 目录下所有 .md 文件进行格式后处理：
 * - 移除多余的"复制页面"文本
 * - 修复列表项紧跟正文的问题
 * - 修复标题前缺少空行的问题
 * - 移除多余空行
 *
 * 使用方式：
 *   node tools/fix-markdown.js
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.resolve(__dirname, '../docs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Remove "复制页面" text
  content = content.replace(/\n?复制页面\n?/g, '\n');

  // 2. Fix list items stuck to preceding text
  content = content.replace(/([：:])\s*(- )/g, '$1\n$2');

  // 3. Ensure blank line before ## and ### headings
  content = content.replace(/([^\n])\n(#{2,3}\s)/g, '$1\n\n$2');

  // 4. Clean up excessive blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  // 5. Wrap bare curl commands in ```bash``` blocks
  let lines = content.split('\n');
  let result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const prevContext = lines.slice(Math.max(0, i - 3), i);
    const alreadyInBlock = prevContext.some(l => l.trim().startsWith('```'));

    if (trimmed.startsWith('curl ') && !alreadyInBlock) {
      const codeLines = [line];
      let j = i + 1;

      while (j < lines.length) {
        const nt = lines[j].trim();
        if (nt.startsWith('-H ') || nt.startsWith('-d ') || nt.startsWith('--header') || nt.startsWith('--location')) {
          codeLines.push(lines[j]);
          j++;
          continue;
        }
        if (nt.match(/^["'{}\[\]]/) || nt === "}'" || nt === "]'" ||
            nt.match(/^"(model|messages|role|content|type|image_url|url|temperature|max_tokens|stream|tools|prompt|size|mode|height|width|num_frames|frame_rate|seed|extra_body)"/)) {
          codeLines.push(lines[j]);
          j++;
          continue;
        }
        break;
      }

      result.push('```bash');
      result.push(...codeLines.map(l => l.replace(/^\s+/, '')));
      result.push('```');
      result.push('');
      i = j;
      continue;
    }

    // Wrap standalone JSON objects
    if (trimmed === '{' && !lines.slice(Math.max(0, i - 3), i).some(l => l.trim().startsWith('```') || l.trim().startsWith('-d'))) {
      const jsonLines = [line];
      let j = i + 1;
      let braces = 1;

      while (j < lines.length && braces > 0) {
        jsonLines.push(lines[j]);
        const nt = lines[j].trim();
        braces += (nt.match(/\{/g) || []).length - (nt.match(/\}/g) || []).length;
        j++;
      }

      if (jsonLines.some(l => l.trim().match(/^"[a-z_]+"\s*:/))) {
        result.push('```json');
        result.push(...jsonLines.map(l => l.replace(/^\s+/, '')));
        result.push('```');
        result.push('');
        i = j;
        continue;
      }
    }

    result.push(line);
    i++;
  }

  content = result.join('\n');
  content = content.replace(/\n{4,}/g, '\n\n\n');
  if (!content.endsWith('\n')) content += '\n';

  fs.writeFileSync(filePath, content, 'utf-8');
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(fullPath);
    else if (entry.name.endsWith('.md')) {
      console.log(`Fixing: ${path.relative(DOCS_DIR, fullPath)}`);
      fixFile(fullPath);
    }
  }
}

walkDir(DOCS_DIR);
console.log('Done!');
