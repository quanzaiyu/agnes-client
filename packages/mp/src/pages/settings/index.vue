<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import AppCard from '@/components/AppCard.vue';
import AppInput from '@/components/AppInput.vue';
import AppButton from '@/components/AppButton.vue';

const user = useUserStore();
const draft = $ref({ ...user.profile });

function save() {
  user.setProfile(draft);
  uni.showToast({ title: '已保存', icon: 'success' });
}
</script>

<template>
  <view class="page px-4 py-4">
    <AppCard>
      <text class="block text-sm text-ink mb-2">昵称</text>
      <AppInput v-model="draft.nickname" placeholder="输入昵称" />
      <text class="block text-sm text-ink mt-4 mb-2">头像 URL</text>
      <AppInput v-model="draft.avatar" placeholder="https://..." />
      <view class="mt-4">
        <AppButton block @click="save">保存</AppButton>
      </view>
    </AppCard>

    <AppCard class="mt-4">
      <text class="text-slate text-sm">登录</text>
      <text class="block text-xs text-slate mt-2">后续将通过 OpenID 接入（暂未启用）</text>
    </AppCard>
  </view>
</template>