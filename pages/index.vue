<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { invidiousInstance, invidiousService } from '~/services/invidious';

function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000)
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  }
  for (let [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit)
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`
    }
  }
  return 'just now'
}



function formatViews(viewCount) {
  if (viewCount >= 1000000) {
    return (viewCount / 1000000).toFixed(1) + 'M';
  } else if (viewCount >= 1000) {
    return (viewCount / 1000).toFixed(1) + 'K';
  }
  return viewCount.toString();
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function getProperThumbnailUrl(video) {
  if (video.videoThumbnails && video.videoThumbnails.length) {
    const thumbnail = video.videoThumbnails.find(t => t.quality === 'medium');
    if (thumbnail) {
      if (thumbnail.url.startsWith('/')) {
        return `${invidiousInstance.value}${thumbnail.url}`;
      }
      if (thumbnail.url.startsWith('http')) {
        return thumbnail.url;
      }
    }
  }
  return `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`;
}

const videos = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');
const instances = ref([
  'https://invidious.io',
  'https://yewtu.be',
  'https://vid.puffyan.us',
  'https://invidious.snopyta.org',
  'https://invidious.kavin.rocks',
]);
const selectedInstance = ref(invidiousInstance.value);

const route = useRoute();

watch(() => route.query.search, (newSearch) => {
  if (newSearch) {
    searchQuery.value = newSearch;
    searchVideos();
  }
}, { immediate: true });

async function loadPopularVideos() {
  isLoading.value = true;
  try {
    const popularVideos = await invidiousService.getPopularVideos();
    videos.value = popularVideos.map(video => ({
      title: video.title,
      url: `/watch?v=${video.videoId}`,
      thumbnail: getProperThumbnailUrl(video),
      channel: video.author,
      channelId: video.authorId,
      verified: video.authorVerified,
      views: formatViews(video.viewCount),
      uploadDate: new Date(video.published * 1000),
      duration: formatDuration(video.lengthSeconds),
      videoId: video.videoId
    }));
  } catch (error) {
    console.error('Error loading videos:', error);
  } finally {
    isLoading.value = false;
  }
}

async function searchVideos() {
  if (!searchQuery.value.trim()) {
    await loadPopularVideos();
    return;
  }
  
  isLoading.value = true;
  try {
    const searchResults = await invidiousService.searchVideos(searchQuery.value);
    videos.value = searchResults
      .filter(item => item.type === 'video')
      .map(video => ({
        title: video.title,
        url: `/watch?v=${video.videoId}`,
        thumbnail: getProperThumbnailUrl(video),
        channel: video.author,
        verified: video.authorVerified,
        views: formatViews(video.viewCount),
        uploadDate: new Date(video.published * 1000),
        duration: formatDuration(video.lengthSeconds),
        videoId: video.videoId
      }));
  } catch (error) {
    console.error('Error searching videos:', error);
  } finally {
    isLoading.value = false;
  }
}

function changeInstance() {
  invidiousService.setInstance(selectedInstance.value);
  loadPopularVideos();
}

onMounted(() => {
  if (!route.query.search) {
    loadPopularVideos();
  }
});

</script>

<template>
  <div class="container mx-auto px-4 py-6">
    
    <!-- Replace the loading spinner with skeleton cards -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Generate 12 skeleton cards -->
      <div v-for="i in 12" :key="i" class="bg-white dark:bg-gray-800 rounded-xl">
        <div class="relative">
          <!-- Thumbnail skeleton -->
          <div class="w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-t-xl animate-pulse"></div>
          <!-- Duration badge skeleton -->
          <div class="absolute bottom-2 right-2 bg-black/80 w-10 h-5 rounded animate-pulse"></div>
        </div>
        <div class="p-4">
          <!-- Title skeleton - two lines -->
          <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1 animate-pulse"></div>
          <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
          
          <!-- Channel info skeleton -->
          <div class="mt-2 flex items-center">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
            <!-- Verified badge skeleton -->
            <div class="w-4 h-4 ml-1 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
          </div>
          
          <!-- Stats skeleton -->
          <div class="mt-1 h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
        </div>
      </div>
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div 
        v-for="video in videos" 
        :key="video.videoId" 
        class="bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <a :href="video.url" class="block">
          <div class="relative">
            <img 
              :src="video.thumbnail" 
              :alt="video.title" 
              class="w-full aspect-video object-cover rounded-t-xl"
            />
            <span class="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
              {{ video.duration }}
            </span>
          </div>
          <div class="p-4">
            <h3 class="font-medium text-base line-clamp-2">{{ video.title }}</h3>
            <div class="mt-2 flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <a 
                :href="`/channel/${video.channelId}`" 
                class="hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                {{ video.channel }}
              </a>
              <svg v-if="video.verified" class="w-4 h-4 ml-1 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {{ video.views }} views • {{ timeAgo(video.uploadDate) }}
            </div>
          </div>
        </a>
      </div>
    </div>
    
    <div v-if="!isLoading && videos.length === 0" class="text-center py-8 text-gray-600 dark:text-gray-400">
      No videos found. Try a different search or instance.
    </div>
  </div>
</template>