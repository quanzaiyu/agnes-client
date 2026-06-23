<script setup lang="ts">
import { ref } from 'vue';
import { videoApi } from '@/api/video';
import { useLocalPoints } from '@/composables/useLocalPoints';
import { useVideoStore } from '@/stores/video';
import AppInput from '@/components/AppInput.vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppEmpty from '@/components/AppEmpty.vue';
import type { VideoTask } from '@/api/types';

const { balance, store: pointsStore } = useLocalPoints();
const videoStore = useVideoStore();

const prompt = $ref('');
const submitting = $ref(false);
const polling = new Map<string, ReturnType<typeof setInterval>>();

async function generate() {
  if (!prompt.trim() || submitting) return;
  if (balance.value < 10) { uni.showToast({ title: '积分不足（需 10）', icon: 'none' }); return; }
  submitting = true;
  try {
    pointsStore.deduct('video');
    const task: VideoTask = await videoApi.generate({ prompt });
    videoStore.upsert({ id: task.id, prompt, status: task.status, url: task.url, createdAt: new Date().toISOString() });
    pollStatus(task.id);
  } catch (e: any) {
    pointsStore.refund('video', '提交失败');
    uni.showToast({ title: e.message || '提交失败', icon: 'none' });
  } finally {
    submitting = false;
  }
}

function pollStatus(id: string) {
  const t = setInterval(async () => {
    try {
      const s = await videoApi.status(id);
      videoStore.upsert({ id, prompt, status: s.status, url: s.url, createdAt: '' });
      if (s.status === 'completed' || s.status === 'failed') {
        if (s.status === 'failed') pointsStore.refund('video', '生成失败');
        clearInterval(t);
        polling.delete(id);
      }
    } catch {
      clearInterval(t);
      polling.delete(id);
    }
  }, 5000);
  polling.set(id, t);
}

onUnload(() => { polling.forEach(t => clearInterval(t)); });
</script>

<template>
  <view class="page px-4 py-4">
    <AppCard>
      <AppInput v-model="prompt" type="textarea" placeholder="描述你想生成的视频…" />
      <view class="mt-3 flex items-center justify-between">
        <text class="text-xs text-slate">积分：{{ balance }} ｜ 消耗 10 积分</text>
        <AppButton :loading="submitting" :disabled="!prompt.trim()" @click="generate">生成</AppButton>
      </view>
    </AppCard>

    <view class="mt-6">
      <text class="font-serif text-xl text-ink mb-3 block">任务列表</text>
      <AppEmpty v-if="videoStore.history.length === 0" />
      <AppCard v-for="v in videoStore.history" :key="v.id" class="mb-3">
        <text class="block text-sm text-ink mb-2 line-clamp-2">{{ v.prompt }}</text>
        <view class="flex items-center gap-2 text-xs text-slate">
          <text>状态：</text>
          <text :class="v.status === 'completed' ? 'text-green' : v.status === 'failed' ? 'text-fuchsia' : 'text-slate'">{{ v.status }}</text>
        </view>
        <video v-if="v.url" :src="v.url" controls class="w-full mt-3 rounded-2xl" />
      </AppCard>
    </view>
  </view>
</template>