<script>
  import { onMount } from 'svelte';
  import { points as pointsApi } from '$lib/api';

  let history = [];
  let loading = true;

  onMount(async () => {
    try {
      const data = await pointsApi.history();
      history = data.history || [];
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<div class="max-w-3xl mx-auto">
  <h1 class="text-xl font-bold mb-6">积分记录</h1>

  {#if loading}
    <div class="card text-center py-12">
      <span class="i-ph-spinner animate-spin text-3xl text-primary-400"></span>
    </div>
  {:else if history.length === 0}
    <div class="card text-center py-12 text-gray-500">
      <span class="i-ph-receipt text-4xl mb-2 block"></span>
      <p>暂无积分记录</p>
    </div>
  {:else}
    <div class="card">
      <table class="w-full">
        <thead>
          <tr class="text-left text-sm text-gray-400 border-b border-border">
            <th class="pb-3">时间</th>
            <th class="pb-3">类型</th>
            <th class="pb-3 text-right">积分</th>
          </tr>
        </thead>
        <tbody>
          {#each history as item}
            <tr class="border-b border-border/50">
              <td class="py-3 text-sm">{formatDate(item.date)}</td>
              <td class="py-3 text-sm">{item.type}</td>
              <td class="py-3 text-right {item.points > 0 ? 'text-green-400' : 'text-red-400'}">
                {item.points > 0 ? '+' : ''}{item.points}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>