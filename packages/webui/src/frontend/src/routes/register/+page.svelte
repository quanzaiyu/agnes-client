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

    <!-- Register Form -->
    <div class="card">
      <h2 class="text-xl font-700 mb-6 text-[#130e30]" style="font-family: var(--font-hedvig-letters-serif)">创建账号</h2>

      <form on:submit|preventDefault={handleSubmit}>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-[#5f5c6e] mb-2">用户名</label>
            <input
              type="text"
              bind:value={username}
              class="input-base"
              placeholder="请输入用户名"
            />
          </div>

          <div>
            <label class="block text-sm text-[#5f5c6e] mb-2">邮箱</label>
            <input
              type="email"
              bind:value={email}
              class="input-base"
              placeholder="请输入邮箱"
            />
          </div>

          <div>
            <label class="block text-sm text-[#5f5c6e] mb-2">密码</label>
            <input
              type="password"
              bind:value={password}
              class="input-base"
              placeholder="请输入密码（至少6位）"
            />
          </div>

          <div>
            <label class="block text-sm text-[#5f5c6e] mb-2">确认密码</label>
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
      </form>

      <p class="text-center text-[#5f5c6e] mt-4">
        已有账号？ <a href="/login" class="link">立即登录</a>
      </p>
    </div>
  </div>
</div>
