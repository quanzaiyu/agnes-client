<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
}
const props = withDefaults(defineProps<Props>(), { variant: 'primary' });
const emit = defineEmits<{ (e: 'click', evt: Event): void }>();
const cls = $computed(() => {
  if (props.variant === 'secondary') return 'btn-secondary';
  if (props.variant === 'ghost') return 'btn-ghost';
  return 'btn-primary';
});
function onClick(e: Event) { if (!props.disabled && !props.loading) emit('click', e); }
</script>

<template>
  <button
    :class="[cls, block && 'w-full', 'relative']"
    :disabled="disabled || loading"
    @click="onClick"
  >
    <text v-if="loading">...</text>
    <slot v-else />
  </button>
</template>