<script>
  import '../app.css';
  import { Sidebar, Toast } from '$components';
  import { user } from '$lib/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  // Auth pages that don't need sidebar
  const authPages = ['/login', '/register'];

  onMount(async () => {
    // Try to fetch user on mount
    const currentUser = await user.fetch();

    // Redirect to login if not authenticated and not on auth page
    if (!currentUser && !authPages.includes($page.url.pathname)) {
      goto('/login');
    }
  });

  $: needsSidebar = !authPages.includes($page.url.pathname);
</script>

<div class="flex min-h-screen bg-surface">
  {#if needsSidebar && $user}
    <Sidebar />
  {/if}

  <main class="flex-1 {$page.url.pathname === '/' ? '' : 'p-6'}">
    <slot />
  </main>
</div>

<Toast />