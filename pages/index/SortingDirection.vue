<template>
  <span class="material-symbols-outlined w-4" v-if="dir === 'desc'">expand_more</span>
  <span class="material-symbols-outlined w-4" v-if="dir === 'asc'">expand_less</span>
</template>

<script setup>
defineProps(['dir'])
</script>
