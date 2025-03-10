<script setup>
const { $pwa } = useNuxtApp()

function close() {
  $pwa.cancelPrompt()
}

async function update() {
  await $pwa.updateServiceWorker()
}
</script>

<template>
  <div v-if="$pwa?.needRefresh" 
       class="fixed bottom-4 right-4 z-50 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
    <div class="flex items-center gap-4">
      <div>
        <p class="font-medium">New version available</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Update to get the latest features
        </p>
      </div>
      <div class="flex gap-2">
        <button @click="close" 
                class="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
          Later
        </button>
        <button @click="update"
                class="px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded">
          Update
        </button>
      </div>
    </div>
  </div>
</template>