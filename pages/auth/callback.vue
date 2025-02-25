<template>
  <div class="flex items-center justify-center min-h-screen">
    <div v-if="loading" class="text-center p-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
      <p class="text-xl">Processing authentication...</p>
    </div>
    
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
      <p class="font-bold">Authentication Error</p>
      <p>{{ error }}</p>
      <button @click="goToLogin" class="mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded">
        Try Again
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { invidiousService } from '~/services/invidious';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(true);
const error = ref('');

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const encodedToken = urlParams.get('token');
  const username = urlParams.get('username');
  
  if (!encodedToken) {
    error.value = 'No authentication token found in the response.';
    loading.value = false;
    return;
  }
  
  try {
    const decodedToken = decodeURIComponent(decodeURIComponent(encodedToken));
    const tokenData = JSON.parse(decodedToken);
    
    if (username) {
      tokenData.username = username;
    }
    
    const instanceUrl = localStorage.getItem('pendingInstance') || 'https://inv.nadeko.net';
    
    const result = invidiousService.tokenLogin(tokenData, instanceUrl);
    
    if (result.success) {
      router.push('/');
    } else {
      error.value = result.error || 'Failed to complete authentication';
      loading.value = false;
    }
  } catch (e) {
    console.error('Token parsing error:', e);
    error.value = 'Invalid token format: ' + e.message;
    loading.value = false;
  }
});

function goToLogin() {
  router.push('/login');
}
</script>