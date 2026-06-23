<script setup lang="ts">
interface Props { title?: string; showBack?: boolean; }
const props = withDefaults(defineProps<Props>(), { showBack: false });
function goBack() { uni.navigateBack({ delta: 1 }); }
</script>

<template>
  <view class="bg-canvas px-4 py-3 flex items-center gap-3 border-b border-ink/10">
    <view v-if="showBack" class="i-ph-arrow-left text-xl text-ink" @click="goBack" />
    <text class="font-medium text-base text-ink">{{ title }}</text>
  </view>
</template>