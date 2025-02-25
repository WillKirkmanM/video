<template>
  <div class="container mx-auto px-4 py-6 max-w-md">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h1 class="text-2xl font-bold mb-6 text-center">Sign In to Invidious</h1>
      
      <div v-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
        <p>{{ error }}</p>
      </div>
      
      <form @submit.prevent="handleLogin">
        <div class="mb-6">
          <label for="instance" class="block mb-2 text-sm font-medium">Invidious Instance</label>
          <input 
            type="text" 
            id="instance" 
            v-model="instance" 
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700"
          >
          <p class="text-sm text-gray-500 mt-1">
            The Invidious instance URL you want to connect to
          </p>
        </div>
        
        <button 
          type="submit" 
          class="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          :disabled="loading"
        >
          <span v-if="loading">Connecting...</span>
          <span v-else>Authorize with Invidious</span>
        </button>
      </form>
      
      <div class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white dark:bg-gray-800 text-gray-500">Or</span>
          </div>
        </div>
        
        <div class="mt-6">
          <h3 class="text-sm font-medium mb-2">Don't have an Invidious account?</h3>
          <a 
            :href="`${instance}/register`"
            target="_blank" 
            rel="noopener"
            class="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Register on Invidious
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { invidiousService } from '~/services/invidious';

const instance = ref('https://inv.nadeko.net');
const error = ref('');
const loading = ref(false);

function handleLogin() {
  error.value = '';
  loading.value = true;
  
  try {
    invidiousService.initiateTokenAuth(instance.value);
  } catch (e) {
    loading.value = false;
    error.value = e.message || 'Failed to start authentication process';
  }
}
</script>