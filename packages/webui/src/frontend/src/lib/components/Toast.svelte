<script>
  import { toasts } from '$lib/stores';

  const icons = {
    success: 'i-ph-check-circle',
    error: 'i-ph-x-circle',
    info: 'i-ph-info'
  };

  // Updated colors for Ditto light theme
  const colors = {
    success: 'text-[#130e30] bg-[#eff2e5] border border-[#59e25d]',
    error: 'text-[#130e30] bg-[#eff2e5] border border-[#e261e5]',
    info: 'text-[#130e30] bg-[#eff2e5] border border-[#5046e4]'
  };
</script>

<div class="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
  {#each $toasts as toast (toast.id)}
    <div
      class="flex items-center gap-3 px-5 py-3.5 rounded-lg shadow-lg animate-pulse {colors[toast.type] || colors.info}"
    >
      <span class="{icons[toast.type] || icons.info} text-xl"></span>
      <span class="text-sm font-400 text-[#130e30]">{toast.message}</span>
    </div>
  {/each}
</div>
