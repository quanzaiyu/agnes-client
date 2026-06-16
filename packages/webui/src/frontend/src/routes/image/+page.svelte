<script>
  import { toasts } from '$lib/stores';
  import { image as imageApi } from '$lib/api';

  let prompt = '';
  let size = '1024x1024';
  let loading = false;
  let result = null;

  const sizes = [
    { id: '512x512', name: '512×512' },
    { id: '768x768', name: '768×768' },
    { id: '1024x1024', name: '1024×1024' },
    { id: '1024x768', name: '1024×768（横版）' },
    { id: '768x1024', name: '768×1024（竖版）' },
    { id: '1920x1080', name: '1920×1080（高清）' }
  ];

  async function generate() {
    if (!prompt.trim()) {
      toasts.error('请输入图片描述');
      return;
    }

    loading = true;
    result = null;

    try {
      const data = await imageApi.generate({ prompt, size });
      result = data;
      toasts.success('图片生成成功！');
    } catch (e) {
      toasts.error(e.message);
    } finally {
      loading = false;
    }
  }

  function downloadImage(url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `agnes-image-${Date.now()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function reset() {
    result = null;
    prompt = '';
  }
</script>

<div class="max-w-4xl mx-auto">
  <h1 class="text-xl font-700 mb-6 text-[#130e30]" style="font-family: var(--font-hedvig-letters-serif)">图片生成</h1>

  <div class="grid grid-cols-2 gap-6">
    <!-- Input Panel -->
    <div class="card">
      <h2 class="text-lg font-700 mb-4 text-[#130e30]" style="font-family: var(--font-hedvig-letters-serif)">生成设置</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-sm text-[#5f5c6e] mb-2">图片描述</label>
          <textarea
            bind:value={prompt}
            class="input-base resize-none"
            rows="6"
            placeholder="描述你想要生成的图片内容..."
          ></textarea>
        </div>

        <div>
          <label class="block text-sm text-[#5f5c6e] mb-2">图片尺寸</label>
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
            生成中...
          {:else}
            <span class="i-ph-magic-wand mr-2"></span>
            生成图片（消耗 1 积分）
          {/if}
        </button>
      </div>
    </div>

    <!-- Result Panel -->
    <div class="card">
      <h2 class="text-lg font-700 mb-4 text-[#130e30]" style="font-family: var(--font-hedvig-letters-serif)">生成结果</h2>

      {#if loading}
        <div class="aspect-square bg-[#f9fbf2] rounded-[24px] flex items-center justify-center">
          <div class="text-center">
            <span class="i-ph-spinner animate-spin text-4xl text-[#130e30] mb-2 block"></span>
            <p class="text-[#5f5c6e]">正在生成图片...</p>
          </div>
        </div>
      {:else if result}
        <div class="space-y-4">
          {#if result.data?.[0]?.url}
            <img
              src={result.data[0].url}
              alt="Generated"
              class="w-full rounded-[24px]"
            />
            <div class="flex gap-2">
              <button class="btn-primary flex-1" on:click={() => downloadImage(result.data[0].url)}>
                <span class="i-ph-download mr-2"></span>
                下载
              </button>
              <button class="btn-secondary flex-1" on:click={reset}>
                <span class="i-ph-arrow-counter-clockwise mr-2"></span>
                重新生成
              </button>
            </div>
          {:else if result.data?.[0]?.b64_json}
            <img
              src="data:image/png;base64,{result.data[0].b64_json}"
              alt="Generated"
              class="w-full rounded-[24px]"
            />
            <button class="btn-secondary w-full" on:click={reset}>
              <span class="i-ph-arrow-counter-clockwise mr-2"></span>
              重新生成
            </button>
          {/if}
        </div>
      {:else}
        <div class="aspect-square bg-[#f9fbf2] rounded-[24px] flex items-center justify-center">
          <div class="text-center text-[#5f5c6e]">
            <span class="i-ph-image text-4xl mb-2 block"></span>
            <p>生成的图片将显示在这里</p>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Tips -->
  <div class="card mt-6">
    <h3 class="font-700 text-[#130e30] mb-2 flex items-center gap-2" style="font-family: var(--font-hedvig-letters-serif)">
      <span class="i-ph-lightbulb text-[#ffe228]"></span>
      生成技巧
    </h3>
    <ul class="text-sm text-[#5f5c6e] space-y-1">
      <li>• 详细描述场景、风格、颜色，光线等细节可以获得更好的效果</li>
      <li>• 可以指定艺术风格，如"油画"、"水彩"、"动漫"等</li>
      <li>• 使用英文描述通常可以获得更好的效果</li>
    </ul>
  </div>
</div>
