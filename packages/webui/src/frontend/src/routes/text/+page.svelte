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

<div class="flex flex-col h-[calc(100vh-64px)]">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-4">
      <h1 class="text-xl font-700 text-[#130e30]" style="font-family: var(--font-hedvig-letters-serif)">文本生成</h1>
      <select bind:value={model} class="bg-[#eff2e5] border border-[#130e30]/20 rounded-[12px] px-4 py-2 text-sm text-[#130e30]">
        {#each models as m}
          <option value={m.id}>{m.name}</option>
        {/each}
      </select>
      <label class="flex items-center gap-2 text-sm text-[#5f5c6e] cursor-pointer">
        <input type="checkbox" bind:checked={thinking} class="rounded border-[#130e30]/30 accent-[#ffe228]" />
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
          <div class="w-10 h-10 rounded-full bg-[#130e30] flex items-center justify-center flex-shrink-0">
            {#if msg.role === 'user'}
              <span class="text-sm text-[#ffe228]">{$user?.nickname?.[0] || $user?.username?.[0] || 'U'}</span>
            {:else}
              <span class="text-sm text-[#ffe228]">A</span>
            {/if}
          </div>
          <div class="max-w-[70%] {msg.role === 'user' ? 'bg-[#ffe228]' : 'bg-[#eff2e5]'} rounded-[24px] p-4 border border-[#130e30]/10">
            {#if msg.role === 'assistant'}
              <div class="markdown-content text-sm">{@html msg.html}</div>
              {#if msg.content}
                <button
                  class="mt-2 text-xs text-[#5f5c6e] hover:text-[#130e30] transition-colors"
                  on:click={() => copyContent(msg.content)}
                >
                  <span class="i-ph-copy mr-1"></span>复制
                </button>
              {/if}
            {:else}
              <p class="text-sm text-[#130e30]">{msg.content}</p>
            {/if}
          </div>
        </div>
      {/if}
    {/each}

    {#if loading}
      <div class="flex gap-3">
        <div class="w-10 h-10 rounded-full bg-[#130e30] flex items-center justify-center flex-shrink-0">
          <span class="text-sm text-[#ffe228]">A</span>
        </div>
        <div class="bg-[#eff2e5] rounded-[24px] p-4 border border-[#130e30]/10">
          <span class="i-ph-spinner animate-spin text-xl text-[#130e30]"></span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Input -->
  <div class="card">
    <form on:submit|preventDefault={sendMessage} class="flex gap-3">
      <textarea
        bind:value={input}
        class="flex-1 bg-[#ffffff] border border-[#130e30] rounded-[24px] px-4 py-3 text-[#130e30] placeholder-[#5f5c6e] resize-none focus:outline-none focus:ring-2 focus:ring-[#ffe228]"
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
        <span class="text-xs text-[#5f5c6e] text-center">消耗 1 积分</span>
      </div>
    </form>
  </div>
</div>
