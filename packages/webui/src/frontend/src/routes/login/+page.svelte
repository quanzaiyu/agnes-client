<script>
  import { goto } from '$app/navigation';
  import { auth, user } from '$lib/api';
  import { toasts } from '$lib/stores';

  let username = '';
  let password = '';
  let loading = false;

  async function handleSubmit() {
    if (!username || !password) {
      toasts.error('请填写用户名和密码');
      return;
    }

    loading = true;
    try {
      const { user: userData } = await auth.login({ username, password });
      toasts.success(`欢迎回来，${userData.nickname || userData.username}！`);
      goto('/');
      // Force reload to update stores
      window.location.href = '/';
    } catch (e) {
      toasts.error(e.message);
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-surface p-4">
  <div class="w-full max-w-md">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center mx-auto mb-4">
        <span class="text-white text-3xl font-bold">A</span>
      </div>
      <h1 class="text-2xl font-bold gradient-text">Agnes AI</h1>
      <p class="text-gray-400 mt-2">智能创作平台</p>
    </div>

    <!-- Login Form -->
    <form class="card" on:submit|preventDefault={handleSubmit}>
      <h2 class="text-xl font-semibold mb-6">登录账号</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1.5">用户名 / 邮箱</label>
          <input
            type="text"
            bind:value={username}
            class="input-base"
            placeholder="请输入用户名或邮箱"
          />
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1.5">密码</label>
          <input
            type="password"
            bind:value={password}
            class="input-base"
            placeholder="请输入密码"
          />
        </div>
      </div>

      <button type="submit" class="btn-primary w-full mt-6" disabled={loading}>
        {#if loading}
          <span class="i-ph-spinner animate-spin mr-2"></span>
        {/if}
        登录
      </button>

      <p class="text-center text-gray-400 mt-4">
        还没有账号？ <a href="/register" class="link">立即注册</a>
      </p>
    </form>
  </div>
</div>