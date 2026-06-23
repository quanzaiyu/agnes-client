<script setup lang="ts">
import { ref } from 'vue';
import { useStreamText } from '@/composables/useStreamText';
import { useLocalPoints } from '@/composables/useLocalPoints';
import { useTextStore } from '@/stores/text';
import AppMessage from '@/components/AppMessage.vue';
import AppButton from '@/components/AppButton.vue';
import AppInput from '@/components/AppInput.vue';
import AppNavbar from '@/components/AppNavbar.vue';
import type { TextMessage } from '@/api/types';

const text = useStreamText();
const { balance, store: pointsStore } = useLocalPoints();
const textStore = useTextStore();

const input = $ref('');
const model = $ref('agnes-2.0-flash');
const loading = $ref(false);

const modelOptions = [
  { label: 'Flash 快速', value: 'agnes-2.0-flash' },
  { label: '1.5 轻量', value: 'agnes-1.5-flash' }
];

function onModelChange(e: any) { model = modelOptions[e.detail.value].value; }

async function send() {
  if (!input.trim() || text.streaming.value) return;
  if (balance.value < 1) { uni.showToast({ title: '积分不足', icon: 'none' }); return; }

  const userMsg: TextMessage = { role: 'user', content: input };
  textStore.pushMessage(userMsg);
  const prompt = input;
  input = '';
  loading = true;

  try {
    pointsStore.deduct('text');
  } catch (e: any) { uni.showToast({ title: e.message, icon: 'none' }); loading = false; return; }

  await text.start({ model, messages: [userMsg] });
  textStore.updateLastAssistant(text.text.value);
  pointsStore.refund(text.text.value ? 'text' : 'text');
  loading = false;
}

function newChat() { textStore.currentId = ''; textStore.ensureCurrent(); }
</script>

<template>
  <view class="page flex flex-col h-screen">
    <AppNavbar title="文本生成">
      <view class="ml-auto" @click="newChat">
        <text class="text-slate text-sm">新对话</text>
      </view>
    </AppNavbar>

    <scroll-view scroll-y class="flex-1 px-4 py-2">
      <AppMessage v-for="(m, i) in textStore.conversations.find(c => c.id === textStore.currentId)?.messages || []" :key="i" :role="m.role" :content="m.content" />
      <view v-if="text.streaming.value && text.text.value" class="my-2 flex justify-start">
        <view class="max-w-[80%] px-4 py-3 rounded-3xl bg-meadow text-ink">
          <text class="text-sm leading-relaxed break-words">{{ text.text.value }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="px-4 py-3 border-t border-ink/10 bg-canvas">
      <view class="mb-2 flex items-center gap-2 text-xs text-slate">
        <text>模型：</text>
        <picker mode="selector" :range="modelOptions" range-key="label" @change="onModelChange">
          <text class="text-ink">{{ modelOptions.find(o => o.value === model)?.label }}</text>
        </picker>
        <text class="ml-auto">积分：{{ balance }}</text>
      </view>
      <view class="flex gap-2 items-end">
        <view class="flex-1">
          <AppInput v-model="input" type="textarea" placeholder="说点什么…" />
        </view>
        <AppButton :loading="loading" :disabled="!input.trim()" @click="send">发送</AppButton>
      </view>
    </view>
  </view>
</template>