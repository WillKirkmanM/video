<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Search } from 'lucide-vue-next';

const searchQuery = ref('');
const router = useRouter();

function handleSearch() {
  if (searchQuery.value.trim()) {
    router.push({
      path: '/',
      query: { search: searchQuery.value }
    });
  }
}
</script>

<template>
  <div class="relative max-w-md flex-1">
    <form @submit.prevent="handleSearch">
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Search videos..."
        class="h-9 w-full rounded-lg border border-input bg-background px-3 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
    </form>
  </div>
</template>