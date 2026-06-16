<script>
  import { user, toasts, points } from '$lib/stores';
  import { auth, points as pointsApi } from '$lib/api';
  import { onMount } from 'svelte';

  let checkedIn = false;
  let loading = false;

  onMount(async () => {
    try {
      const { checkedIn: status } = await pointsApi.checkinStatus();
      checkedIn = status;
    } catch (e) {
      // User might not be logged in
    }
  });

  async function handleCheckin() {
    loading = true;
    try {
      const res = await pointsApi.checkin();
      checkedIn = true;
      user.updatePoints(10);
      toasts.success(res.message);
    } catch (e) {
      toasts.error(e.message);
    } finally {
      loading = false;
    }
  }

  const features = [
    { icon: 'i-ph-chat-text', title: '文本生成', desc: 'AI 驱动的智能文本创作', points: 1, color: 'bg-[#130e30]' },
    { icon: 'i-ph-image', title: '图片生成', desc: '输入描述即可生成精美图片', points: 1, color: 'bg-[#5046e4]' },
    { icon: 'i-ph-video', title: '视频生成', desc: 'AI 驱动的视频创作工具', points: 10, color: 'bg-[#130e30]' }
  ];

  function getFeaturePath(feature) {
    if (feature.title === '文本生成') return '/text';
    if (feature.title === '图片生成') return '/image';
    return '/video';
  }
</script>

<div class="max-w-5xl mx-auto pt-8">
  <!-- Hero Section -->
  <div class="text-center mb-12">
    <h1 class="text-4xl font-bold mb-4" style="font-family: var(--font-hedvig-letters-serif); color: #130e30;">
      欢迎回来，<span class="gradient-text">{$user?.nickname || $user?.username || '用户'}</span>
    </h1>
    <p class="text-[#5f5c6e] text-lg">使用 Agnes AI 智能创作平台释放您的创意</p>
  </div>

  <!-- Points Card -->
  <div class="card mb-8 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-[#ffe228] flex items-center justify-center">
        <span class="i-ph-coins text-2xl text-[#130e30]"></span>
      </div>
      <div>
        <p class="text-sm text-[#5f5c6e]">当前积分</p>
        <p class="text-2xl font-bold text-[#130e30]">{$user?.points || 0}</p>
      </div>
    </div>

    {#if !checkedIn}
      <button
        class="btn-primary"
        disabled={loading}
        on:click={handleCheckin}
      >
        {#if loading}
          <span class="i-ph-spinner animate-spin mr-2"></span>
        {/if}
        每日签到 +10
      </button>
    {:else}
      <span class="text-[#130e30] flex items-center gap-2 font-medium">
        <span class="i-ph-check-circle text-xl text-[#59e25d]"></span>
        今日已签到
      </span>
    {/if}
  </div>

  <!-- Feature Cards -->
  <div class="grid grid-cols-3 gap-6 mb-8">
    {#each features as feature}
      <a href={getFeaturePath(feature)} class="card-hover group cursor-pointer block no-underline">
        <div class="w-12 h-12 rounded-xl {feature.color} flex items-center justify-center mb-4">
          <span class="{feature.icon} text-2xl text-[#ffe228]"></span>
        </div>
        <h3 class="text-lg font-bold text-[#130e30] mb-1 group-hover:text-[#5046e4] transition-colors" style="font-family: var(--font-hedvig-letters-serif)">{feature.title}</h3>
        <p class="text-sm text-[#5f5c6e] mb-3">{feature.desc}</p>
        <span class="text-xs text-[#5f5c6e]">消耗 {feature.points} 积分/次</span>
      </a>
    {/each}
  </div>

  <!-- Quick Actions -->
  <div class="card">
    <h2 class="text-lg font-bold text-[#130e30] mb-4" style="font-family: var(--font-hedvig-letters-serif)">快捷操作</h2>
    <div class="grid grid-cols-2 gap-4">
      <a href="/text" class="flex items-center gap-3 p-4 rounded-xl bg-[#f9fbf2] hover:bg-[#ffe228] transition-all group no-underline">
        <span class="i-ph-lightning text-2xl text-[#130e30]"></span>
        <span class="text-[#130e30] font-medium">快速文本生成</span>
      </a>
      <a href="/settings" class="flex items-center gap-3 p-4 rounded-xl bg-[#f9fbf2] hover:bg-[#ffe228] transition-all group no-underline">
        <span class="i-ph-user text-2xl text-[#130e30]"></span>
        <span class="text-[#130e30] font-medium">个人设置</span>
      </a>
    </div>
  </div>
</div>

<style>
  :global(a.no-underline) {
    text-decoration: none !important;
  }
</style>
