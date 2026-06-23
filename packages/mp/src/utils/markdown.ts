// 极简 MD：支持 # ## ###、**bold**、*italic*、`code`、列表、代码块
// 不引第三方，避免包体积膨胀
export function renderMarkdown(input: string): string {
  if (!input) return '';
  let s = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // 代码块
  s = s.replace(/```([\s\S]*?)```/g, (_, code) => `<pre class="md-pre"><code>${code}</code></pre>`);
  // 行内代码
  s = s.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');
  // 标题
  s = s.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
       .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
       .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');
  // 粗体 + 斜体
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
       .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // 列表
  s = s.replace(/(?:^|\n)((?:- .+(?:\n|$))+)/g, (m, block) => {
    const items = block.trim().split('\n').map((l: string) => `<li>${l.replace(/^- /, '')}</li>`).join('');
    return `\n<ul class="md-ul">${items}</ul>`;
  });
  // 段落
  s = s.split(/\n{2,}/).map(p => p.startsWith('<') ? p : `<p class="md-p">${p.replace(/\n/g, '<br/>')}</p>`).join('\n');
  return s;
}