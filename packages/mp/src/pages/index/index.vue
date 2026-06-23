<script setup lang="ts">
import { useLocalPoints } from '@/composables/useLocalPoints';
import AppCard from '@/components/AppCard.vue';

const { balance } = useLocalPoints();

const features = [
  { icon: 'i-carbon-chat', title: '文本生成', desc: '多轮对话、流式输出、Markdown 渲染', path: '/pages/text/index' },
  { icon: 'i-carbon-image', title: '图片生成', desc: '多种尺寸、预览、下载', path: '/pages/image/index' },
  { icon: 'i-carbon-video', title: '视频生成', desc: '文/图生视频、进度跟踪', path: '/pages/video/index' },
  { icon: 'i-carbon-currency', title: '积分中心', desc: '签到领积分、查看流水', path: '/pages/points/index' }
];

function go(path: string) { uni.navigateTo({ url: path }); }
</script>

<template>
  <view class="page px-4 py-6">
    <view class="mb-6">
      <text class="font-serif text-3xl text-ink">Agnes</text>
      <text class="block text-slate text-sm mt-1">智能内容生成 · 你的创作伙伴</text>
    </view>

    <AppCard class="mb-6">
      <view class="flex items-center justify-between">
        <view>
          <text class="text-slate text-xs">当前积分</text>
          <text class="block text-ink text-2xl font-serif">{{ balance }}</text>
        </view>
        <view class="i-carbon-currency text-3xl text-yellow" />
      </view>
    </AppCard>

    <view class="grid grid-cols-2 gap-3">
      <AppCard v-for="f in features" :key="f.title" hoverable @click="go(f.path)">
        <view :class="[f.icon, 'text-2xl text-ink mb-2']" />
        <text class="block font-medium text-ink">{{ f.title }}</text>
        <text class="block text-slate text-xs mt-1">{{ f.desc }}</text>
      </AppCard>
    </view>
  </view>
</template>