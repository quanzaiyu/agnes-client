<script setup lang="ts">
interface Props { modelValue: string; placeholder?: string; type?: 'text' | 'textarea' | 'password'; disabled?: boolean; }
const props = withDefaults(defineProps<Props>(), { type: 'text' });
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();
function onInput(e: any) { emit('update:modelValue', e.detail.value); }
</script>

<template>
  <input
    v-if="type !== 'textarea'"
    class="input-base"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :password="type === 'password'"
    @input="onInput"
  />
  <textarea
    v-else
    class="input-base"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="onInput"
  />
</template>