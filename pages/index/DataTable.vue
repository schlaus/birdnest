<template>
  <!-- Data table -->
  <div class="table max-w-3xl my-8 table-auto text-sm">

    <!-- Header row -->
    <div class="table-header-group select-none">
      <div class="table-row h-4">
        <div class="table-cell border-b-2 border-slate-600 border-r"
             title="Minimum observed distance to nest"
             @click="updateSorting('dist')">
          Min.dist.
          <SortingDirection v-if="sorting.key === 'dist'" :dir="sorting.dir" />
        </div>

        <!-- Pilot header for small screens -->
        <div class="table-cell md:hidden border-b-2 border-slate-600">
          Pilot
        </div>

        <!-- Pilot headers for >= medium screens -->
        <div class="hidden md:table-cell border-b-2 border-slate-600 cursor-pointer"
             @click="updateSorting('pilot')">
          Pilot name
          <SortingDirection v-if="sorting.key === 'pilot'" :dir="sorting.dir" />
        </div>
        <div class="hidden md:table-cell border-b-2 border-slate-600 cursor-pointer"
             @click="updateSorting('email')">
          Email
          <SortingDirection v-if="sorting.key === 'email'" :dir="sorting.dir" />
        </div>
        <div class="hidden md:table-cell border-b-2 border-slate-600 cursor-pointer"
             @click="updateSorting('phone')">
          Phone
          <SortingDirection v-if="sorting.key === 'phone'" :dir="sorting.dir" />
        </div>

        <div class="table-cell border-b-2 border-slate-600 cursor-pointer border-l"
             @click="updateSorting('seen')">
          Last seen
          <SortingDirection v-if="sorting.key === 'seen'" :dir="sorting.dir" />
        </div>
      </div>
    </div>

    <!-- Data rows -->
    <div v-for="drone in printableDrones"
         @mouseover="mouseOverHandler(drone.serialNumber)"
         @mouseleave="mouseLeaveHandler(drone.serialNumber)"
         class="table-row h-8"
         :class="{ 'bg-amber-100': drone.serialNumber === selectedDroneSerial }">

      <!-- Closest distance column -->
      <div class="table-cell border-b border-slate-600 border-r">
        {{ drone.closestDistance }} m
      </div>

      <!-- Pilot & drone data for small screens -->
      <template v-if="drone.pilot">
        <div class="table-cell md:hidden border-b border-slate-600">
          <div>
            <ColorKey :color="drone.color" />
            {{ drone.pilot.name }}
          </div>
          <div>
            <a :href="`mailto:${drone.pilot.email}`">
              {{ drone.pilot.email }}
            </a>
          </div>
          <div>
            <a :href="`tel:${drone.pilot.phoneNumber}`">
              {{ drone.pilot.phoneNumber }}
            </a>
          </div>
          <div>

            <!-- "Show drone details"-button for small screens -->
            <div>
              <button @click.stop="toggleDetails(drone.serialNumber)"
                      class="inline-block mb-2">

                <template v-if="!drone.detailsShown">
                  Show drone details
                  <span class="material-symbols-outlined">expand_circle_down</span>
                </template>
                <template v-else>
                  Hide drown details
                  <span class="material-symbols-outlined rotate-180">expand_circle_down</span>
                </template>

              </button>
            </div>

            <!-- Drone details datalist for small screens -->
            <DroneDetails :class="{ hidden: !drone.detailsShown }" :drone="drone" />

          </div>
        </div>

        <!-- Pilot & drone data for >= medium screens -->
        <div class="hidden md:table-cell border-b border-slate-600 pl-1">
          <ColorKey :color="drone.color" />
          {{ drone.pilot.name }}

          <!-- Drone details datalist for >= medium screens -->
          <DroneDetails :class="{ hidden: !drone.detailsShown }" :drone="drone" class="ml-4" />

        </div>
        <div class="hidden md:table-cell border-b border-slate-600">
          <a :href="`mailto:${drone.pilot.email}`">
            {{ drone.pilot.email }}
          </a>
        </div>
        <div class="hidden md:table-cell border-b border-slate-600">
          <a :href="`tel:${drone.pilot.phoneNumber}`">
            {{ drone.pilot.phoneNumber }}
          </a>
        </div>
      </template>

      <!-- Pilot data loading indicator -->
      <template v-else>
        <div class="table-cell border-b border-slate-600 pl-2"><span class="italic">Pending...</span></div>
        <div class="hidden md:table-cell border-b border-slate-600 align-middle">
          <div class="flex flex-col justify-center content-center">
            <div class="loading-bar w-56 h-2 inline-block rounded-lg">&nbsp;</div>
          </div>
        </div>
        <div class="hidden md:table-cell border-b border-slate-600"></div>
      </template>

      <!-- Last seen column -->
      <div class="table-cell border-b border-slate-600 text-xs border-l">
        <template v-if="drone.lastSeenText">
          {{ drone.lastSeenText }} ago
        </template>
      </div>

      <!-- 'Show drone details'-button for >= medium screens -->
      <div class="hidden md:table-cell">
        <button class="inline-block" @click.stop="toggleDetails(drone.serialNumber)">
          <template v-if="!drone.detailsShown">
            <span class="material-symbols-outlined">
              expand_circle_down
            </span>
          </template>
          <template v-else>
            <span class="material-symbols-outlined rotate-180">
              expand_circle_down
            </span>
          </template>
        </button>

      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'

import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'

import DroneDetails from './DroneDetails.vue'
import ColorKey from './ColorKey.vue'
import SortingDirection from './SortingDirection.vue'

const props = defineProps(['drones', 'selectedDroneSerial'])
const emit = defineEmits(['droneSelected'])
const sorting = reactive({})


TimeAgo.addLocale(en)

const timeAgo = new TimeAgo('en-US')


const drones = props.drones

const mouseOverHandler = (serialNumber) => {
  emit('droneSelected', serialNumber)
}

const mouseLeaveHandler = (serialNumber) => {
  if (props.selectedDroneSerial === serialNumber) {
    emit('droneSelected', '')
  }
}

const toggleDetails = (serialNumber) => {
  drones[serialNumber].detailsShown = !drones[serialNumber].detailsShown
}

const updateSorting = (key) => {
  if (sorting.key === key) {
    sorting.dir = sorting.dir === 'asc' ? 'desc' : 'asc'
  } else {
    sorting.key = key
    sorting.dir = 'asc'
  }
}

const sortingFns = {
  dist: (a, b) => a.closestDistance - b.closestDistance,
  pilot: (a, b) => a.pilot && b.pilot ? a.pilot.name.localeCompare(b.pilot.name) : 0,
  email: (a, b) => a.pilot && b.pilot ? a.pilot.email.localeCompare(b.pilot.email) : 0,
  phone: (a, b) => a.pilot && b.pilot ? a.pilot.phoneNumber.localeCompare(b.pilot.phoneNumber) : 0,
  seen: (a, b) => new Date(a.lastSeen) - new Date(b.lastSeen)
}

const getSortingFn = () => {
  if (sorting.dir === 'asc') {
    return sortingFns[sorting.key]
  }
  return (a, b) => -sortingFns[sorting.key](a, b)
}

const formatLastSeen = (d) => d ? timeAgo.format(new Date(d), 'mini-minute', { round: 'floor' }) : ''

const updateLastSeenText = () => {
  if (drones) {
    for (const drone of Object.values(drones)) {
      drone.lastSeenText = formatLastSeen(drone.lastSeen)
    }
  }
}

sorting.key = 'dist'
sorting.dir = 'asc'

const printableDrones = computed(() => {
  return Object.values(drones)
    .sort(getSortingFn())
    .map(drone => {
      const droneCopy = { ...drone }
      // The toFixed() method has some potential rounding issues, so some trickery
      // is needed to get reliable results. The distance (originally in millimeters)
      // is first rounded to an int with decimeter precision, then divided once more
      // to get meters as a float and finally toFixed(1) is used to trim the result
      // to single decimal precision.
      droneCopy.closestDistance = (Math.round(drone.closestDistance / 100) / 10).toFixed(1)

      return droneCopy
    })
})

if (!import.meta.env.SSR) {
  setInterval(() => {
    updateLastSeenText()
  }, 1000)
} else {
  updateLastSeenText()
}
</script>

<style>
.table-cell {
  padding-left: 4px;
  line-height: 2rem;
}

.material-symbols-outlined {
  bottom: -7px;
  position: relative;
}

.loading-bar {
  background: linear-gradient(27deg, #ec9d9a, #cff17e, #ede172);
  filter: hue-rotate(0deg);
  animation: hue 3s infinite;
}

@keyframes hue {

  0%,
  100% {
    -webkit-filter: hue-rotate(0deg);
  }

  50% {
    -webkit-filter: hue-rotate(180deg);
  }
}
</style>
