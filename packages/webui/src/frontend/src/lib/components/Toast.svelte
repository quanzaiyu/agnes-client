<script>
  import { toasts } from '$lib/stores';

  const icons = {
    success: 'i-ph-check-circle',
    error: 'i-ph-x-circle',
    info: 'i-ph-info'
  };

  const colors = {
    success: 'text-green-400 bg-green-400/10 border-green-400/30',
    error: 'text-red-400 bg-red-400/10 border-red-400/30',
    info: 'text-blue-400 bg-blue-400/10 border-blue-400/30'
  };
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
  {#each $toasts as toast (toast.id)}
    <div
      class="flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm
        animate-pulse {colors[toast.type] || colors.info}"
    >
      <span class="{icons[toast.type] || icons.info} text-xl"></span>
      <span class="text-sm font-medium">{toast.message}</span>
    </div>
  {/each}
</div>