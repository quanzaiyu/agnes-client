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

  async function handleLogout() {
    try {
      await auth.logout();
      user.logout();
      window.location.href = '/login';
    } catch (e) {
      toasts.error(e.message);
    }
  }

  const features = [
    { icon: 'i-ph-chat-text', title: '文本生成', desc: 'AI 驱动的智能文本创作', points: 1, color: 'from-blue-500 to-cyan-400' },
    { icon: 'i-ph-image', title: '图片生成', desc: '输入描述即可生成精美图片', points: 1, color: 'from-purple-500 to-pink-400' },
    { icon: 'i-ph-video', title: '视频生成', desc: 'AI 驱动的视频创作工具', points: 10, color: 'from-orange-500 to-red-400' }
  ];
</script>

<div class="max-w-5xl mx-auto">
  <!-- Hero Section -->
  <div class="text-center mb-12">
    <h1 class="text-4xl font-bold mb-4">
      欢迎回来，<span class="gradient-text">{$user?.nickname || $user?.username || '用户'}</span>
    </h1>
    <p class="text-gray-400 text-lg">使用 Agnes AI 智能创作平台释放您的创意</p>
  </div>

  <!-- Points Card -->
  <div class="card mb-8 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center">
        <span class="i-ph-coins text-2xl"></span>
      </div>
      <div>
        <p class="text-sm text-gray-400">当前积分</p>
        <p class="text-2xl font-bold">{$user?.points || 0}</p>
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
      <span class="text-green-400 flex items-center gap-2">
        <span class="i-ph-check-circle text-xl"></span>
        今日已签到
      </span>
    {/if}
  </div>

  <!-- Feature Cards -->
  <div class="grid grid-cols-3 gap-6 mb-8">
    {#each features as feature}
      <a href={feature.title === '文本生成' ? '/text' : feature.title === '图片生成' ? '/image' : '/video'} class="card-hover group cursor-pointer">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br {feature.color} flex items-center justify-center mb-4">
          <span class="{feature.icon} text-2xl"></span>
        </div>
        <h3 class="text-lg font-semibold mb-1 group-hover:text-primary-400 transition-colors">{feature.title}</h3>
        <p class="text-sm text-gray-400 mb-3">{feature.desc}</p>
        <span class="text-xs text-gray-500">消耗 {feature.points} 积分/次</span>
      </a>
    {/each}
  </div>

  <!-- Quick Actions -->
  <div class="card">
    <h2 class="text-lg font-semibold mb-4">快捷操作</h2>
    <div class="grid grid-cols-2 gap-4">
      <a href="/text" class="flex items-center gap-3 p-4 rounded-lg bg-surface-200 hover:bg-surface-300 transition-colors">
        <span class="i-ph-lightning text-2xl text-yellow-400"></span>
        <span>快速文本生成</span>
      </a>
      <a href="/settings" class="flex items-center gap-3 p-4 rounded-lg bg-surface-200 hover:bg-surface-300 transition-colors">
        <span class="i-ph-user text-2xl text-blue-400"></span>
        <span>个人设置</span>
      </a>
    </div>
  </div>
</div>