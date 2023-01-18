<template>
  <h1 class="text-4xl mb-8">Birdnest NDZ monitoring tool</h1>
  <div class="flex flex-col">
    <div class="grow flex flex-col justify-center rounded shadow-lg bg-white">

      <!-- Map -->
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
                v-for="(pos, timestamp) in drones[selectedDroneSerial].positions"
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

    <!-- Data table -->
    <div class="table max-w-3xl my-8 table-auto text-sm">

      <!-- Header row -->
      <div class="table-header-group select-none">
        <div class="table-row h-4">
          <div class="table-cell border-b-2 border-slate-600 border-r"
               title="Minimum observed distance to nest"
               @click="updateSorting('dist')">
            Min. dist.
            <template v-if="sorting.key === 'dist'">
              <span class="material-symbols-outlined" v-if="sorting.dir === 'desc'">expand_more</span>
              <span class="material-symbols-outlined" v-if="sorting.dir === 'asc'">expand_less</span>
            </template>
          </div>

          <!-- Pilot header for small screens -->
          <div class="table-cell md:hidden border-b-2 border-slate-600">
            Pilot
          </div>

          <!-- Pilot headers for >= medium screens -->
          <div class="hidden md:table-cell border-b-2 border-slate-600 cursor-pointer"
               @click="updateSorting('pilot')">
            Pilot name
            <template v-if="sorting.key === 'pilot'">
              <span class="material-symbols-outlined" v-if="sorting.dir === 'desc'">expand_more</span>
              <span class="material-symbols-outlined" v-if="sorting.dir === 'asc'">expand_less</span>
            </template>
          </div>
          <div class="hidden md:table-cell border-b-2 border-slate-600 cursor-pointer" @click="updateSorting('email')">
            Email
            <template v-if="sorting.key === 'email'">
              <span class="material-symbols-outlined" v-if="sorting.dir === 'desc'">expand_more</span>
              <span class="material-symbols-outlined" v-if="sorting.dir === 'asc'">expand_less</span>
            </template>
          </div>
          <div class="hidden md:table-cell border-b-2 border-slate-600 cursor-pointer" @click="updateSorting('phone')">
            Phone
            <template v-if="sorting.key === 'phone'">
              <span class="material-symbols-outlined" v-if="sorting.dir === 'desc'">expand_more</span>
              <span class="material-symbols-outlined" v-if="sorting.dir === 'asc'">expand_less</span>
            </template>
          </div>

          <div class="table-cell border-b-2 border-slate-600 cursor-pointer border-l" @click="updateSorting('seen')">
            Last seen
            <template v-if="sorting.key === 'seen'">
              <span class="material-symbols-outlined" v-if="sorting.dir === 'desc'">expand_more</span>
              <span class="material-symbols-outlined" v-if="sorting.dir === 'asc'">expand_less</span>
            </template>
          </div>
        </div>
      </div>

      <!-- Data rows -->
      <div v-for="drone in printableDrones"
           @mouseover="mapMouseOver(drone.serialNumber)"
           @mouseleave="mapMouseLeave(drone.serialNumber)"
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
              <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" class="inline-block w-3">
                <rect width="50" height="50" :fill="drone.color" />
              </svg>
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
              <div class="text-right">
                <button @click.stop="toggleDetails(drone.serialNumber)"
                        class="inline-block">
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
              <dl :class="{ hidden: !drone.detailsShown }">
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

            </div>
          </div>

          <!-- Pilot & drone data for >= medium screens -->
          <div class="hidden md:table-cell border-b border-slate-600">
            <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" class="inline-block w-3">
              <rect width="50" height="50" :fill="drone.color" />
            </svg>
            {{ drone.pilot.name }}

            <!-- Drone details datalist for >= medium screens -->
            <dl :class="{ hidden: !drone.detailsShown }"
                class="overflow-x-visible w-2 whitespace-nowrap ml-4 mt-2">
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
  </div>
</template>

<script setup>
import { inject, computed, reactive, ref, onMounted } from 'vue'
import stc from 'string-to-color'
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'

let timeAgo

if (!import.meta.env.SSR) {
  // Default locale is only set client-side to avoid an error for
  // setting it twice.
  TimeAgo.addDefaultLocale(en)
  timeAgo = new TimeAgo('en-US')
}

const props = defineProps(['drones'])
const drones = reactive(props.drones)
const selectedDroneSerial = ref('')
const sorting = reactive({})


// Helpers and sorting functions

const createDronePath = (positions) => Object.keys(positions)
  .sort()
  .map(timestamp => positions[timestamp])
  .reduce((str, pos) => `${str} ${pos[0]},${pos[1]}`, '')

const mapMouseOver = (serialNumber) => {
  selectedDroneSerial.value = serialNumber
}

const mapMouseLeave = (serialNumber) => {
  if (selectedDroneSerial.value === serialNumber) {
    selectedDroneSerial.value = ''
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

onMounted(() => {
  updateLastSeenText()
})

if (!import.meta.env.SSR) {
  setInterval(() => {
    updateLastSeenText()
  }, 1000)

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
          if (key === 'lastSeen') {
            drones[serialNumber].lastSeenText = formatLastSeen(value)
          } else if (key === 'pilot') {
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

.table-cell {
  padding-left: 4px;
  line-height: 2rem;
}

svg text {
  font-size: 10000px;
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
