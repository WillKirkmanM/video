<script setup lang="ts">
import UpdatePWA from './components/PWA/UpdatePWA.vue';

</script>

<template>
  <NuxtLayout>
    <NuxtPwaManifest />
    <UpdatePWA />
    <NuxtPage />
  </NuxtLayout>
</template>