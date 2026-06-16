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

<aside class="w-64 h-full bg-[#eff2e5] flex flex-col border-r border-[#130e30]/10">
  <!-- Logo -->
  <div class="p-6 border-b border-[#130e30]/10">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-[12px] bg-[#130e30] flex items-center justify-center">
        <span class="text-[#ffe228] text-xl font-semibold">A</span>
      </div>
      <div>
        <h1 class="text-lg font-semibold text-[#130e30]" style="font-family: var(--font-hedvig-letters-serif)">Agnes AI</h1>
        <p class="text-xs text-[#5f5c6e]">智能创作平台</p>
      </div>
    </div>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 p-4 space-y-1">
    {#each navItems as item}
      <a
        href={item.path}
        class="flex items-center gap-3 px-4 py-3 rounded-[12px] transition-all duration-200 no-underline
          {isActive(item.path)
            ? 'bg-[#ffe228] text-[#130e30] font-medium'
            : 'text-[#5f5c6e] hover:bg-[#f9fbf2] hover:text-[#130e30]'}"
      >
        <span class="{item.icon} text-xl"></span>
        <span class="font-normal text-sm">{item.label}</span>
      </a>
    {/each}
  </nav>

  <!-- User Info -->
  {#if $user}
    <div class="p-4 border-t border-[#130e30]/10">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-[#130e30] flex items-center justify-center overflow-hidden">
          {#if $user.avatar}
            <img src={$user.avatar} alt={$user.nickname || $user.username} class="w-full h-full object-cover" />
          {:else}
            <span class="text-lg text-[#ffe228]">{$user.nickname?.[0] || $user.username[0]?.toUpperCase()}</span>
          {/if}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-[#130e30] truncate">{$user.nickname || $user.username}</p>
          <p class="text-xs text-[#5f5c6e]">{$user.points} 积分</p>
        </div>
      </div>
    </div>
  {/if}
</aside>
