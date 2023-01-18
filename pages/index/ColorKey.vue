<template>
  <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" class="inline-block w-3">
    <rect width="50" height="50" :fill="color" />
  </svg>
</template>

<script setup>
const props = defineProps(['color'])
</script>
