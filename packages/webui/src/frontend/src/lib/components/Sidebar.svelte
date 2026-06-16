<script>
  import { page } from '$app/stores';
  import { user } from '$lib/stores';

  const navItems = [
    { path: '/', icon: 'i-ph-house', label: '首页' },
    { path: '/text', icon: 'i-ph-chat-text', label: '文本生成' },
    { path: '/image', icon: 'i-ph-image', label: '图片生成' },
    { path: '/video', icon: 'i-ph-video', label: '视频生成' },
    { path: '/settings', icon: 'i-ph-gear', label: '设置' }
  ];

  $: isActive = (path) => $page.url.pathname === path;
</script>

<aside class="w-64 h-screen bg-surface-100 border-r border-border flex flex-col">
  <!-- Logo -->
  <div class="p-5 border-b border-border">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center">
        <span class="text-white text-xl font-bold">A</span>
      </div>
      <div>
        <h1 class="text-lg font-bold gradient-text">Agnes AI</h1>
        <p class="text-xs text-gray-500">智能创作平台</p>
      </div>
    </div>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 p-3 space-y-1">
    {#each navItems as item}
      <a
        href={item.path}
        class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200
          {isActive(item.path)
            ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
            : 'text-gray-400 hover:bg-surface-200 hover:text-white'}"
      >
        <span class="{item.icon} text-xl"></span>
        <span class="font-medium">{item.label}</span>
      </a>
    {/each}
  </nav>

  <!-- User Info -->
  {#if $user}
    <div class="p-4 border-t border-border">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-surface-300 flex items-center justify-center overflow-hidden">
          {#if $user.avatar}
            <img src={$user.avatar} alt={$user.nickname || $user.username} class="w-full h-full object-cover" />
          {:else}
            <span class="text-lg">{$user.nickname?.[0] || $user.username[0]?.toUpperCase()}</span>
          {/if}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{$user.nickname || $user.username}</p>
          <p class="text-xs text-gray-500">{$user.points} 积分</p>
        </div>
      </div>
    </div>
  {/if}
</aside>