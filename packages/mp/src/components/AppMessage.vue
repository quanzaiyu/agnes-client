<script setup lang="ts">
import { computed } from 'vue';
import { renderMarkdown } from '@/utils/markdown';

interface Props { role: 'user' | 'assistant'; content: string; }
const props = defineProps<Props>();
const html = computed(() => renderMarkdown(props.content));
const isUser = computed(() => props.role === 'user');
</script>

<template>
  <view :class="['flex my-2', isUser ? 'justify-end' : 'justify-start']">
    <view :class="[
      'max-w-[80%] px-4 py-3 rounded-3xl',
      isUser ? 'bg-yellow text-ink' : 'bg-meadow text-ink'
    ]">
      <view v-if="isUser" class="whitespace-pre-wrap break-words text-sm leading-relaxed">{{ content }}</view>
      <view v-else class="text-sm leading-relaxed break-words" v-html="html" />
    </view>
  </view>
</template>

<style>
.md-pre { background: rgba(19,14,48,0.06); padding: 8px 12px; border-radius: 8px; overflow-x: auto; font-size: 12px; }
.md-code { background: rgba(19,14,48,0.08); padding: 1px 4px; border-radius: 4px; font-size: 12px; }
.md-h1 { font-size: 22px; font-weight: 700; margin: 8px 0; }
.md-h2 { font-size: 18px; font-weight: 700; margin: 6px 0; }
.md-h3 { font-size: 16px; font-weight: 600; margin: 4px 0; }
.md-p { margin: 4px 0; }
.md-ul { padding-left: 18px; list-style: disc; }
</style>