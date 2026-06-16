<script>
  import { toasts } from '$lib/stores';
  import { video as videoApi } from '$lib/api';

  let prompt = '';
  let imageUrl = '';
  let mode = 'text2video';
  let size = '1216x832';
  let loading = false;
  let polling = false;
  let result = null;
  let statusInterval = null;

  const sizes = [
    { id: '768x512', name: '768×512（标清）' },
    { id: '1216x832', name: '1216×832（标准）' },
    { id: '1920x1080', name: '1920×1080（高清）' }
  ];

  const modes = [
    { id: 'text2video', name: '文字转视频' },
    { id: 'img2video', name: '图片转视频' }
  ];

  async function generate() {
    if (!prompt.trim()) {
      toasts.error('请输入视频描述');
      return;
    }

    if (mode === 'img2video' && !imageUrl.trim()) {
      toasts.error('请提供图片或图片URL');
      return;
    }

    loading = true;
    result = null;

    try {
      const sizeParts = size.split('x');
      const data = await videoApi.generate({
        prompt,
        image: imageUrl || undefined,
        mode: mode === 'img2video' ? mode : undefined,
        width: parseInt(sizeParts[0]),
        height: parseInt(sizeParts[1])
      });

      result = data;
      toasts.success('视频生成任务已创建，开始轮询状态...');

      // Start polling
      if (data.video_id) {
        pollStatus(data.video_id);
      }
    } catch (e) {
      toasts.error(e.message);
    } finally {
      loading = false;
    }
  }

  async function pollStatus(videoId) {
    polling = true;
    statusInterval = setInterval(async () => {
      try {
        const status = await videoApi.status(videoId);
        if (status.status === 'completed') {
          result = { ...result, ...status };
          clearInterval(statusInterval);
          polling = false;
          toasts.success('视频生成完成！');
        } else if (status.status === 'failed') {
          clearInterval(statusInterval);
          polling = false;
          toasts.error('视频生成失败');
        } else {
          result = { ...result, ...status };
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 5000);
  }

  function reset() {
    if (statusInterval) clearInterval(statusInterval);
    result = null;
    prompt = '';
    imageUrl = '';
  }

  $: progress = result?.progress || 0;
  $: status = result?.status || (loading ? 'processing' : 'idle');
</script>

<div class="max-w-4xl mx-auto">
  <h1 class="text-xl font-700 mb-6 text-[#130e30]" style="font-family: var(--font-hedvig-letters-serif)">视频生成</h1>

  <div class="card mb-6">
    <h2 class="text-lg font-700 mb-4 text-[#130e30]" style="font-family: var(--font-hedvig-letters-serif)">生成设置</h2>

    <div class="space-y-4">
      <div>
        <label class="block text-sm text-[#5f5c6e] mb-2">生成模式</label>
        <div class="flex gap-2">
          {#each modes as m}
            <button
              class="px-4 py-2 rounded-lg border transition-all {mode === m.id ? 'bg-[#ffe228] border-[#130e30] text-[#130e30]' : 'border-[#130e30]/30 text-[#5f5c6e] hover:border-[#130e30] hover:text-[#130e30]'}"
              on:click={() => mode = m.id}
            >
              {m.name}
            </button>
          {/each}
        </div>
      </div>

      <div>
        <label class="block text-sm text-[#5f5c6e] mb-2">视频描述</label>
        <textarea
          bind:value={prompt}
          class="input-base resize-none"
          rows="4"
          placeholder="描述你想要生成的视频内容..."
        ></textarea>
      </div>

      {#if mode === 'img2video'}
        <div>
          <label class="block text-sm text-[#5f5c6e] mb-2">参考图片（URL）</label>
          <input
            type="text"
            bind:value={imageUrl}
            class="input-base"
            placeholder="输入图片URL或留空使用AI生成的图片..."
          />
        </div>
      {/if}

      <div>
        <label class="block text-sm text-[#5f5c6e] mb-2">视频尺寸</label>
        <select bind:value={size} class="input-base">
          {#each sizes as s}
            <option value={s.id}>{s.name}</option>
          {/each}
        </select>
      </div>

      <button
        class="btn-primary w-full"
        on:click={generate}
        disabled={loading || !prompt.trim()}
      >
        {#if loading}
          <span class="i-ph-spinner animate-spin mr-2"></span>
          提交中...
        {:else}
          <span class="i-ph-video-camera mr-2"></span>
          生成视频（消耗 10 积分）
        {/if}
      </button>
    </div>
  </div>

  <!-- Result Panel -->
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-700 text-[#130e30]" style="font-family: var(--font-hedvig-letters-serif)">生成结果</h2>
      {#if polling}
        <span class="text-sm text-[#130e30] flex items-center gap-2">
          <span class="i-ph-spinner animate-spin"></span>
          生成中: {progress}%
        </span>
      {/if}
    </div>

    {#if result?.video_url}
      <div class="space-y-4">
        <video
          src={result.video_url}
          controls
          class="w-full rounded-[24px] bg-[#130e30]"
        ></video>
        <div class="flex gap-2">
          <a href={result.video_url} download class="btn-primary flex-1 text-center">
            <span class="i-ph-download mr-2"></span>
            下载视频
          </a>
          <button class="btn-secondary flex-1" on:click={reset}>
            <span class="i-ph-arrow-counter-clockwise mr-2"></span>
            重新生成
          </button>
        </div>
      </div>
    {:else if result}
      <div class="aspect-video bg-[#f9fbf2] rounded-[24px] flex items-center justify-center">
        <div class="text-center">
          {#if polling}
            <div class="mb-4">
              <div class="w-32 h-2 bg-[#eff2e5] rounded-full overflow-hidden mx-auto">
                <div
                  class="h-full bg-[#ffe228] transition-all"
                  style="width: {progress}%"
                ></div>
              </div>
              <p class="text-[#5f5c6e] mt-2">{progress}%</p>
            </div>
            <span class="i-ph-spinner animate-spin text-4xl text-[#130e30] mb-2 block"></span>
            <p class="text-[#5f5c6e]">视频生成中，请稍候...</p>
            <p class="text-xs text-[#5f5c6e] mt-2">这可能需要几分钟时间</p>
          {:else}
            <span class="i-ph-video-camera text-4xl text-[#5f5c6e] mb-2 block"></span>
            <p class="text-[#5f5c6e]">等待生成...</p>
          {/if}
        </div>
      </div>
    {:else}
      <div class="aspect-video bg-[#f9fbf2] rounded-[24px] flex items-center justify-center">
        <div class="text-center text-[#5f5c6e]">
          <span class="i-ph-video-camera text-4xl mb-2 block"></span>
          <p>生成的视频将显示在这里</p>
        </div>
      </div>
    {/if}
  </div>

  <!-- Tips -->
  <div class="card mt-6">
    <h3 class="font-700 text-[#130e30] mb-2 flex items-center gap-2" style="font-family: var(--font-hedvig-letters-serif)">
      <span class="i-ph-lightbulb text-[#ffe228]"></span>
      生成技巧
    </h3>
    <ul class="text-sm text-[#5f5c6e] space-y-1">
      <li>• 视频描述应该描述镜头运动、场景变化等动态内容</li>
      <li>• 使用图片转视频模式可以获得更可控的结果</li>
      <li>• 高清模式生成时间更长，但质量更好</li>
      <li>• 视频生成可能需要几分钟时间，请耐心等待</li>
    </ul>
  </div>
</div>
