<script>
  import { onMount } from 'svelte';
  import { user, toasts } from '$lib/stores';
  import { user as userApi } from '$lib/api';

  let nickname = '';
  let loading = false;
  let uploadingAvatar = false;
  let fileInput;

  onMount(async () => {
    const currentUser = await user.fetch();
    if (currentUser) {
      nickname = currentUser.nickname || '';
    }
  });

  async function updateProfile() {
    loading = true;
    try {
      await userApi.updateProfile({ nickname });
      await user.fetch();
      toasts.success('资料更新成功！');
    } catch (e) {
      toasts.error(e.message);
    } finally {
      loading = false;
    }
  }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    uploadingAvatar = true;
    try {
      await userApi.uploadAvatar(file);
      await user.fetch();
      toasts.success('头像上传成功！');
    } catch (e) {
      toasts.error(e.message);
    } finally {
      uploadingAvatar = false;
    }
  }

  function triggerFileInput() {
    fileInput?.click();
  }
</script>

<div class="max-w-2xl mx-auto">
  <h1 class="text-xl font-700 mb-6 text-[#130e30]" style="font-family: var(--font-hedvig-letters-serif)">个人设置</h1>

  <div class="space-y-6">
    <!-- Avatar -->
    <div class="card">
      <h2 class="text-lg font-700 mb-4 text-[#130e30]" style="font-family: var(--font-hedvig-letters-serif)">头像</h2>
      <div class="flex items-center gap-6">
        <div class="w-24 h-24 rounded-full bg-[#130e30] flex items-center justify-center overflow-hidden border-4 border-[#ffe228]/30">
          {#if $user?.avatar}
            <img src={$user.avatar} alt="Avatar" class="w-full h-full object-cover" />
          {:else}
            <span class="text-3xl text-[#ffe228]">{$user?.nickname?.[0] || $user?.username?.[0] || 'U'}</span>
          {/if}
        </div>
        <div>
          <input
            type="file"
            accept="image/*"
            class="hidden"
            bind:this={fileInput}
            on:change={uploadAvatar}
          />
          <button
            class="btn-primary"
            on:click={triggerFileInput}
            disabled={uploadingAvatar}
          >
            {#if uploadingAvatar}
              <span class="i-ph-spinner animate-spin mr-2"></span>
              上传中...
            {:else}
              <span class="i-ph-upload mr-2"></span>
              上传头像
            {/if}
          </button>
          <p class="text-xs text-[#5f5c6e] mt-2">支持 JPG、PNG、GIF、WebP 格式，最大 2MB</p>
        </div>
      </div>
    </div>

    <!-- Profile -->
    <div class="card">
      <h2 class="text-lg font-700 mb-4 text-[#130e30]" style="font-family: var(--font-hedvig-letters-serif)">个人资料</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-sm text-[#5f5c6e] mb-2">用户名</label>
          <input
            type="text"
            value={$user?.username || ''}
            class="input-base"
            disabled
          />
          <p class="text-xs text-[#5f5c6e] mt-1">用户名不可修改</p>
        </div>

        <div>
          <label class="block text-sm text-[#5f5c6e] mb-2">邮箱</label>
          <input
            type="email"
            value={$user?.email || ''}
            class="input-base"
            disabled
          />
          <p class="text-xs text-[#5f5c6e] mt-1">邮箱不可修改</p>
        </div>

        <div>
          <label class="block text-sm text-[#5f5c6e] mb-2">昵称</label>
          <input
            type="text"
            bind:value={nickname}
            class="input-base"
            placeholder="设置您的昵称"
          />
        </div>

        <button
          class="btn-primary"
          on:click={updateProfile}
          disabled={loading}
        >
          {#if loading}
            <span class="i-ph-spinner animate-spin mr-2"></span>
          {/if}
          保存修改
        </button>
      </div>
    </div>

    <!-- Points Info -->
    <div class="card">
      <h2 class="text-lg font-700 mb-4 text-[#130e30]" style="font-family: var(--font-hedvig-letters-serif)">积分记录</h2>

      <div class="flex items-center justify-between mb-4 p-4 bg-[#f9fbf2] rounded-[24px]">
        <div>
          <p class="text-sm text-[#5f5c6e]">当前积分</p>
          <p class="text-2xl font-700 text-[#130e30]">{$user?.points || 0}</p>
        </div>
        <div class="text-right text-sm text-[#5f5c6e]">
          <p>注册赠送: +100</p>
          <p>每日签到: +10/次</p>
          <p>文本/图片: -1/次</p>
          <p>视频生成: -10/次</p>
        </div>
      </div>

      <a href="/points" class="link text-sm flex items-center gap-1">
        查看全部积分记录 <span class="i-ph-arrow-right ml-1"></span>
      </a>
    </div>
  </div>
</div>
