<template>
  <div class="outer-wrapper bg-gradient-to-bl from-slate-100 to-neutral-100">
    <div class="container max-w-3xl mx-auto">
      <div class="content py-8">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { provide } from 'vue'
import SocketIO from 'socket.io-client'

if (!import.meta.env.ssr) {
  provide('socket-io', SocketIO)
  provide('socket', SocketIO())
}

</script>

<style>
@import url('https://fonts.googleapis.com/css?family=Rubik&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');


.material-symbols-outlined {
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 48
}
</style>

<style scoped>

</style>
