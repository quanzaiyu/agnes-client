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

<svelte:head>
  <style>
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
    }
  </style>
</svelte:head>

<div class="app-container">
  <!-- Decorative blobs for auth pages -->
  {#if !needsSidebar}
    <div class="decorative-blobs">
      <div class="blob-green"></div>
      <div class="blob-pink"></div>
      <div class="blob-yellow"></div>
    </div>
  {/if}

  {#if needsSidebar && $user}
    <aside class="sidebar">
      <Sidebar />
    </aside>
  {/if}

  <div class="content-wrapper">
    <main class="content {$page.url.pathname === '/' ? '' : 'with-padding'}">
      <slot />
    </main>
  </div>
</div>

<Toast />

<style>
  :global(html, body) {
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .app-container {
    display: flex;
    height: 100vh;
    width: 100vw;
    background-color: #f9fbf2;
    overflow: hidden;
  }

  .sidebar {
    flex-shrink: 0;
    width: 256px;
    height: 100vh;
    overflow-y: auto;
    background-color: #eff2e5;
  }

  .content-wrapper {
    flex: 1;
    min-width: 0;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .content {
    flex: 1;
    background-color: #f9fbf2;
    overflow-y: auto;
  }

  .content.with-padding {
    padding: 32px;
  }
</style>
