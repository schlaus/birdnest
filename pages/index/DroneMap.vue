<template>
  <div class="grow flex flex-col justify-center rounded shadow-lg bg-white">
    <svg viewBox="0 0 500000 500000" xmlns="http://www.w3.org/2000/svg" class="w-full">

      <!-- Vertical grid lines -->
      <line :x1="index * 50000" y1="0"
            :x2="index * 50000" y2="500000"
            stroke="black" stroke-width="80"
            v-for="index in 9" :key="index" />

      <!-- Horizontal grid lines -->
      <line v-for="index in 9" :key="index"
            x1="0" :y1="index * 50000"
            :y2="index * 50000" x2="500000"
            stroke="black" stroke-width="80" />

      <!-- NDZ perimeter -->
      <circle cx="250000" cy="250000" r="100000"
              stroke="black" stroke-width="500" fill="none" />
      <polyline points="320711,320711 330711,335711 400000,335711"
                stroke="gray" stroke-width="500" fill="none" />
      <text x="332211" y="334711">
        NDZ perimeter
      </text>

      <!-- Nest -->
      <circle cx="250000" cy="250000" r="2000"
              stroke="black" stroke-width="500" fill="black" />
      <polyline points="250000,250000 260000,265000 285000,265000"
                stroke="gray" stroke-width="500" fill="none" />
      <text x="261500" y="264000">
        Nest
      </text>

      <!-- Drones (current position) -->
      <circle v-for="drone in drones"
              :cx="drone.positionX" :cy="drone.positionY"
              :r="selectedDroneSerial === drone.serialNumber ? 3500 : 2000"
              :stroke="drone.color" :fill="drone.color"
              :class="{
                'opacity-20': selectedDroneSerial && selectedDroneSerial !== drone.serialNumber
              }"
              class="transition-opacity" stroke-width="40" />

      <!-- Drones (past positions) -->
      <circle v-if="selectedDroneSerial && drones[selectedDroneSerial]"
              v-for="pos in drones[selectedDroneSerial].positions"
              :cx="pos[0]" :cy="pos[1]" r="2000"
              :stroke="drones[selectedDroneSerial].color"
              :fill="drones[selectedDroneSerial].color" />

      <!-- Drone flight paths -->
      <polyline v-if="selectedDroneSerial && drones[selectedDroneSerial]"
                :points="drones[selectedDroneSerial].path"
                :stroke="drones[selectedDroneSerial].color"
                fill="none" class="transition-opacity"
                stroke-width="500" stroke-dasharray="1500" />
    </svg>

    <div class="px-3 py-2 flex flex-row">
      <div class="font-bold">
        N.B.
      </div>
      <div class="pl-2">
        Flight paths shown are the shortest possible routes between observed drone positions
        and may deviate from the actual flight paths.
      </div>
    </div>
  </div>

</template>

<script setup>
defineProps(['drones', 'selectedDroneSerial'])
</script>
