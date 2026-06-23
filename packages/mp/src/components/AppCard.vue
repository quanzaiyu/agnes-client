<script setup lang="ts">
interface Props { hoverable?: boolean; }
const props = withDefaults(defineProps<Props>(), { hoverable: false });
</script>

<template>
  <view :class="hoverable ? 'card-hover' : 'card'">
    <slot />
  </view>
</template>