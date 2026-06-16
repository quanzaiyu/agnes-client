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

<div class="min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="w-16 h-16 rounded-2xl bg-[#130e30] flex items-center justify-center mx-auto mb-4">
        <span class="text-[#ffe228] text-3xl font-700" style="font-family: var(--font-hedvig-letters-serif)">A</span>
      </div>
      <h1 class="text-2xl font-700 text-heading" style="font-family: var(--font-hedvig-letters-serif); color: #130e30;">Agnes AI</h1>
      <p class="text-[#5f5c6e] mt-2">智能创作平台</p>
    </div>

    <!-- Login Form -->
    <div class="card">
      <h2 class="text-xl font-700 mb-6 text-[#130e30]" style="font-family: var(--font-hedvig-letters-serif)">登录账号</h2>

      <form on:submit|preventDefault={handleSubmit}>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-[#5f5c6e] mb-2">用户名 / 邮箱</label>
            <input
              type="text"
              bind:value={username}
              class="input-base"
              placeholder="请输入用户名或邮箱"
            />
          </div>

          <div>
            <label class="block text-sm text-[#5f5c6e] mb-2">密码</label>
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
      </form>

      <p class="text-center text-[#5f5c6e] mt-4">
        还没有账号？ <a href="/register" class="link">立即注册</a>
      </p>
    </div>
  </div>
</div>
