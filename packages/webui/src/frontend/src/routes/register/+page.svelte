<script>
  import { goto } from '$app/navigation';
  import { auth } from '$lib/api';
  import { toasts } from '$lib/stores';

  let username = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let loading = false;

  async function handleSubmit() {
    if (!username || !email || !password) {
      toasts.error('请填写所有必填字段');
      return;
    }

    if (password !== confirmPassword) {
      toasts.error('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      toasts.error('密码长度至少为6位');
      return;
    }

    loading = true;
    try {
      await auth.register({ username, email, password });
      toasts.success('注册成功！请登录');
      goto('/login');
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

    <!-- Register Form -->
    <form class="card" on:submit|preventDefault={handleSubmit}>
      <h2 class="text-xl font-semibold mb-6">创建账号</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1.5">用户名</label>
          <input
            type="text"
            bind:value={username}
            class="input-base"
            placeholder="请输入用户名"
          />
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1.5">邮箱</label>
          <input
            type="email"
            bind:value={email}
            class="input-base"
            placeholder="请输入邮箱"
          />
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1.5">密码</label>
          <input
            type="password"
            bind:value={password}
            class="input-base"
            placeholder="请输入密码（至少6位）"
          />
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1.5">确认密码</label>
          <input
            type="password"
            bind:value={confirmPassword}
            class="input-base"
            placeholder="请再次输入密码"
          />
        </div>
      </div>

      <button type="submit" class="btn-primary w-full mt-6" disabled={loading}>
        {#if loading}
          <span class="i-ph-spinner animate-spin mr-2"></span>
        {/if}
        注册（送 100 积分）
      </button>

      <p class="text-center text-gray-400 mt-4">
        已有账号？ <a href="/login" class="link">立即登录</a>
      </p>
    </form>
  </div>
</div>