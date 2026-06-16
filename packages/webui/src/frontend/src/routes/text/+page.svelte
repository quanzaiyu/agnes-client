<script>
  import { onMount, onDestroy } from 'svelte';
  import { user, toasts } from '$lib/stores';
  import { text as textApi } from '$lib/api';
  import { marked } from 'marked';

  let messages = [{ role: 'system', content: '你是一个有帮助的AI助手。' }];
  let input = '';
  let loading = false;
  let model = 'agnes-2.0-flash';
  let thinking = false;
  let controller = null;

  const models = [
    { id: 'agnes-2.0-flash', name: 'Agnes 2.0 Flash（快速）' },
    { id: 'agnes-2.0', name: 'Agnes 2.0（标准）' },
    { id: 'agnes-2.0-thinking', name: 'Agnes 2.0 Thinking（深度思考）' }
  ];

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    messages = [...messages, userMessage];
    input = '';
    loading = true;

    controller = new AbortController();

    try {
      const res = await textApi.generateStream({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        thinking
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      // Add assistant message placeholder
      messages = [...messages, { role: 'assistant', content: '' }];
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices?.[0]?.delta?.content) {
                messages[messages.length - 1].content += data.choices[0].delta.content;
                messages = messages; // Trigger reactivity
              }
            } catch (e) {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        toasts.info('生成已取消');
      } else {
        toasts.error(e.message);
        // Remove failed message
        messages = messages.slice(0, -1);
      }
    } finally {
      loading = false;
      controller = null;
    }
  }

  function stopGeneration() {
    if (controller) {
      controller.abort();
    }
  }

  function clearChat() {
    messages = [{ role: 'system', content: '你是一个有帮助的AI助手。' }];
  }

  function copyContent(content) {
    navigator.clipboard.writeText(content);
    toasts.success('已复制到剪贴板');
  }

  $: renderedMessages = messages.map(m => ({
    ...m,
    html: m.role === 'assistant' ? marked.parse(m.content || '') : m.content
  }));
</script>

<div class="flex flex-col h-[calc(100vh-48px)]">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-4">
      <h1 class="text-xl font-bold">文本生成</h1>
      <select bind:value={model} class="bg-surface-200 border border-border rounded-lg px-3 py-1.5 text-sm">
        {#each models as m}
          <option value={m.id}>{m.name}</option>
        {/each}
      </select>
      <label class="flex items-center gap-2 text-sm text-gray-400">
        <input type="checkbox" bind:checked={thinking} class="rounded" />
        深度思考
      </label>
    </div>
    <button class="btn-ghost text-sm" on:click={clearChat}>
      <span class="i-ph-trash mr-1"></span>
      清除对话
    </button>
  </div>

  <!-- Messages -->
  <div class="flex-1 overflow-y-auto space-y-4 mb-4">
    {#each renderedMessages as msg, i}
      {#if msg.role !== 'system'}
        <div class="flex gap-3 {msg.role === 'user' ? 'flex-row-reverse' : ''}">
          <div class="w-8 h-8 rounded-lg bg-surface-300 flex items-center justify-center flex-shrink-0">
            {#if msg.role === 'user'}
              <span class="text-sm">{$user?.nickname?.[0] || $user?.username?.[0] || 'U'}</span>
            {:else}
              <span class="text-sm">A</span>
            {/if}
          </div>
          <div class="max-w-[70%] {msg.role === 'user' ? 'bg-primary-500/20 border border-primary-500/30' : 'bg-surface-100 border border-border'} rounded-xl p-4">
            {#if msg.role === 'assistant'}
              <div class="markdown-content prose prose-invert max-w-none text-sm">{@html msg.html}</div>
              {#if msg.content}
                <button
                  class="mt-2 text-xs text-gray-500 hover:text-gray-300"
                  on:click={() => copyContent(msg.content)}
                >
                  <span class="i-ph-copy mr-1"></span>复制
                </button>
              {/if}
            {:else}
              <p class="text-sm">{msg.content}</p>
            {/if}
          </div>
        </div>
      {/if}
    {/each}

    {#if loading}
      <div class="flex gap-3">
        <div class="w-8 h-8 rounded-lg bg-surface-300 flex items-center justify-center flex-shrink-0">
          <span class="text-sm">A</span>
        </div>
        <div class="bg-surface-100 border border-border rounded-xl p-4">
          <span class="i-ph-spinner animate-spin text-xl text-primary-400"></span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Input -->
  <div class="card">
    <form on:submit|preventDefault={sendMessage} class="flex gap-3">
      <textarea
        bind:value={input}
        class="flex-1 bg-surface-200 border border-border rounded-lg px-4 py-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        rows="2"
        placeholder="输入您的问题..."
        disabled={loading}
      ></textarea>
      <div class="flex flex-col gap-2">
        {#if loading}
          <button type="button" class="btn-secondary px-4" on:click={stopGeneration}>
            <span class="i-ph-stop mr-1"></span>
            停止
          </button>
        {:else}
          <button type="submit" class="btn-primary px-6" disabled={!input.trim()}>
            <span class="i-ph-paper-plane-tilt mr-1"></span>
            发送
          </button>
        {/if}
        <span class="text-xs text-gray-500 text-center">消耗 1 积分</span>
      </div>
    </form>
  </div>
</div>