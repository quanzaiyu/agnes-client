<script setup lang="ts">
import { ref } from 'vue';
import { imageApi } from '@/api/image';
import { useLocalPoints } from '@/composables/useLocalPoints';
import { useImageStore } from '@/stores/image';
import AppInput from '@/components/AppInput.vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppEmpty from '@/components/AppEmpty.vue';

const { balance, store: pointsStore } = useLocalPoints();
const imageStore = useImageStore();

const prompt = $ref('');
const size = $ref('1024x1024');
const loading = $ref(false);

const sizes = ['512x512', '768x768', '1024x1024', '1024x768', '768x1024', '1920x1080'];

async function generate() {
  if (!prompt.trim() || loading) return;
  if (balance.value < 1) { uni.showToast({ title: '积分不足', icon: 'none' }); return; }
  loading = true;
  try {
    pointsStore.deduct('image');
    const r = await imageApi.generate({ prompt, size });
    const url = r.images?.[0]?.url || '';
    imageStore.add({ id: 'i_' + Date.now().toString(36), prompt, url, size, createdAt: new Date().toISOString() });
    if (!url) pointsStore.refund('image', '生成失败');
  } catch (e: any) {
    pointsStore.refund('image', '生成失败');
    uni.showToast({ title: e.message || '生成失败', icon: 'none' });
  } finally {
    loading = false;
  }
}

function download(url: string) {
  // #ifdef H5
  const a = document.createElement('a');
  a.href = url; a.download = 'agnes.png'; a.click();
  // #endif
  // #ifdef MP-WEIXIN
  uni.downloadFile({ url, success: (res) => uni.saveImageToPhotosAlbum({ filePath: res.tempFilePath }) });
  // #endif
}
</script>

<template>
  <view class="page px-4 py-4">
    <AppCard>
      <AppInput v-model="prompt" type="textarea" placeholder="描述你想生成的图片…" />
      <view class="mt-3 flex flex-wrap gap-2">
        <view
          v-for="s in sizes" :key="s"
          :class="['px-3 py-1 rounded-full text-xs', size === s ? 'bg-yellow text-ink' : 'bg-pearl text-slate border border-ink/10']"
          @click="size = s"
        >
          <text>{{ s }}</text>
        </view>
      </view>
      <view class="mt-3 flex items-center justify-between">
        <text class="text-xs text-slate">积分：{{ balance }} ｜ 消耗 1 积分</text>
        <AppButton :loading="loading" :disabled="!prompt.trim()" @click="generate">生成</AppButton>
      </view>
    </AppCard>

    <view class="mt-6">
      <text class="font-serif text-xl text-ink mb-3 block">历史记录</text>
      <AppEmpty v-if="imageStore.history.length === 0" />
      <view v-else class="grid grid-cols-2 gap-3">
        <AppCard v-for="r in imageStore.history" :key="r.id" hoverable>
          <image :src="r.url" mode="aspectFill" class="w-full h-40 rounded-2xl" @click="download(r.url)" />
          <text class="block text-xs text-slate mt-2 line-clamp-2">{{ r.prompt }}</text>
        </AppCard>
      </view>
    </view>
  </view>
</template>