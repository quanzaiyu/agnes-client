<script setup lang="ts">
import { useLocalPoints } from '@/composables/useLocalPoints';
import { formatPoints, formatDate } from '@/utils/format';
import AppCard from '@/components/AppCard.vue';
import AppButton from '@/components/AppButton.vue';
import AppEmpty from '@/components/AppEmpty.vue';

const { balance, checkedInToday, history, store } = useLocalPoints();

async function onCheckin() {
  try {
    await store.checkin();
    uni.showToast({ title: '签到成功 +10', icon: 'success' });
  } catch (e: any) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
</script>

<template>
  <view class="page px-4 py-4">
    <AppCard>
      <text class="text-slate text-xs">当前积分</text>
      <text class="block text-4xl font-serif text-ink my-2">{{ formatPoints(balance) }}</text>
      <AppButton :disabled="checkedInToday" @click="onCheckin">
        {{ checkedInToday ? '今日已签到' : '每日签到 +10' }}
      </AppButton>
    </AppCard>

    <view class="mt-6">
      <text class="font-serif text-xl text-ink mb-3 block">积分记录</text>
      <AppEmpty v-if="history.length === 0" />
      <AppCard v-for="(h, i) in history" :key="i" class="mb-2 !p-4">
        <view class="flex items-center justify-between">
          <text class="text-sm text-ink">{{ h.reason }}</text>
          <text :class="h.delta >= 0 ? 'text-green' : 'text-fuchsia'" class="text-sm font-medium">
            {{ h.delta >= 0 ? '+' : '' }}{{ h.delta }}
          </text>
        </view>
        <text class="block text-xs text-slate mt-1">{{ formatDate(h.date) }}</text>
      </AppCard>
    </view>
  </view>
</template>