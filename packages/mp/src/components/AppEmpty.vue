<script setup lang="ts">
interface Props { text?: string; icon?: string; }
withDefaults(defineProps<Props>(), { text: '暂无数据', icon: 'i-carbon-document-blank' });
</script>

<template>
  <view class="flex flex-col items-center justify-center py-16 text-slate">
    <view :class="[icon, 'text-5xl mb-3']" />
    <text class="text-sm">{{ text }}</text>
  </view>
</template>