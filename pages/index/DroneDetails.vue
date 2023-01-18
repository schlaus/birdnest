<template>
  <dl class="overflow-x-visible whitespace-nowrap w-2 mt-2">
    <dt class="font-bold leading-4">Serial number</dt>
    <dd>{{ drone.serialNumber }}</dd>
    <dt class="font-bold leading-4">Model</dt>
    <dd>{{ drone.model }}</dd>
    <dt class="font-bold leading-4">Manufacturer</dt>
    <dd>{{ drone.manufacturer }}</dd>
    <dt class="font-bold leading-4">MAC-address</dt>
    <dd>{{ drone.mac }}</dd>
    <dt class="font-bold leading-4">IPv4</dt>
    <dd>{{ drone.ipv4 }}</dd>
    <dt class="font-bold leading-4">IPv6</dt>
    <dd>{{ drone.ipv6 }}</dd>
    <dt class="font-bold leading-4">Firmware</dt>
    <dd>{{ drone.firmware }}</dd>
    <dt class="font-bold leading-4">Altitude</dt>
    <dd>{{ drone.altitude }}</dd>
  </dl>
</template>

<script setup>
defineProps(['drone'])
</script>
