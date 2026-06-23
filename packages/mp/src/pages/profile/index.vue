<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import { useLocalPoints } from '@/composables/useLocalPoints';
import AppCard from '@/components/AppCard.vue';

const user = useUserStore();
const { balance } = useLocalPoints();
</script>

<template>
  <view class="page px-4 py-4">
    <AppCard>
      <view class="flex items-center gap-4">
        <image :src="user.profile.avatar || '/static/avatar_default.png'" class="w-16 h-16 rounded-full bg-meadow" />
        <view>
          <text class="block font-serif text-xl text-ink">{{ user.profile.nickname || '未登录' }}</text>
          <text class="block text-xs text-slate">积分：{{ balance }}</text>
        </view>
      </view>
    </AppCard>

    <AppCard class="mt-4" hoverable @click="uni.navigateTo({ url: '/pages/settings/index' })">
      <text class="text-sm text-ink">设置</text>
    </AppCard>

    <AppCard class="mt-2" hoverable @click="uni.navigateTo({ url: '/pages/points/index' })">
      <text class="text-sm text-ink">积分中心</text>
    </AppCard>
  </view>
</template>