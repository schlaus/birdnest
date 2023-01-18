<template>
  <h1 class="text-4xl mb-8">Birdnest NDZ monitoring tool</h1>
  <div class="flex flex-col">

    <DroneMap :drones="drones"
              :selected-drone-serial="selectedDroneSerial" />



    <DataTable :drones="drones"
               :selected-drone-serial="selectedDroneSerial"
               @drone-selected="setSelectedDroneSerial" />

  </div>
</template>

<script setup>
import { inject, computed, reactive, ref } from 'vue'
import stc from 'string-to-color'

import DataTable from './DataTable.vue'
import DroneMap from './DroneMap.vue'

const props = defineProps(['drones'])
const drones = reactive(props.drones)
const selectedDroneSerial = ref('')


const setSelectedDroneSerial = (serialNumber) => {
  selectedDroneSerial.value = serialNumber
}

// Helpers and sorting functions

const createDronePath = (positions) => Object.keys(positions)
  .sort()
  .map(timestamp => positions[timestamp])
  .reduce((str, pos) => `${str} ${pos[0]},${pos[1]}`, '')



if (drones) {
  for (const drone of Object.values(drones)) {
    drone.color = stc(drone.serialNumber)
    drone.path = createDronePath(drone.positions)
    if (drone.pilot) {
      drone.pilot.name = `${drone.pilot.lastName}, ${drone.pilot.firstName}`
    }
    drone.detailsShown = false
  }
}




if (!import.meta.env.SSR) {

  const socket = inject('socket')
  socket.on('data', (serialNumber, data) => {
    if (!data) {
      console.log(`Deleting ${serialNumber}`)
      if (selectedDroneSerial === serialNumber) selectedDroneSerial.value = ''
      if (drones[serialNumber]) delete drones[serialNumber]
    } else {
      if (!drones[serialNumber]) {
        console.log(`Adding new drone: ${serialNumber}`, data)
        drones[serialNumber] = { color: stc(serialNumber), detailsShown: false }
      }
      for (const [key, value] of Object.entries(data)) {
        if (key === 'positions') {
          if (!drones[serialNumber].positions) {
            drones[serialNumber].positions = {}
          }
          for (const [timestamp, pos] of Object.entries(value)) {
            drones[serialNumber].positions[timestamp] = pos
          }
          drones[serialNumber].path = createDronePath(drones[serialNumber].positions)
        } else {
          drones[serialNumber][key] = value
          if (key === 'pilot') {
            if (!drones[serialNumber].pilot) {
              console.log(`Received pilot data for ${serialNumber}`, value)
            }
            drones[serialNumber].pilot.name = `${value.lastName}, ${value.firstName}`
          }
        }
      }
    }
  })
}

</script>

<style>
#map {
  width: 500px;
}


svg text {
  font-size: 10000px;
}
</style>
