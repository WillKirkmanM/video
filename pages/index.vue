<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { invidiousInstance, invidiousService, defaultInstances } from '~/services/invidious';
import { contentFilterService } from '~/services/content-filter';
import { subscriptionService } from '~/services/subscription';

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
const instances = computed(() => invidiousService.getInstances());
const selectedInstance = ref(invidiousInstance.value);
const newInstanceUrl = ref('');
const showInstanceManager = ref(false);
const filteredCount = ref(0);
const showFilteredMessage = computed(() => filteredCount.value > 0);

const activeTab = ref('subscriptions');
const hasSubscriptions = computed(() => subscriptionService.getSubscriptions().length > 0);
const feedLoading = ref(false);

const route = useRoute();

watch(() => route.query.search, (newSearch) => {
  if (newSearch) {
    searchQuery.value = newSearch;
    searchVideos();
  }
}, { immediate: true });

watch(hasSubscriptions, (newValue) => {
  if (!newValue && activeTab.value === 'subscriptions') {
    activeTab.value = 'popular';
  }
}, { immediate: true });

async function loadPopularVideos() {
  if (activeTab.value === 'subscriptions') {
    await loadSubscriptionFeed();
    return;
  }

  isLoading.value = true;
  try {
    const popularVideos = await invidiousService.getPopularVideos();
    const filteredVideos = [];
    filteredCount.value = 0;
    
    for (const video of popularVideos) {
      const filterResult = await contentFilterService.shouldFilterVideo(video);
      if (!filterResult.filtered) {
        filteredVideos.push({
          title: video.title,
          url: `/watch?v=${video.videoId}`,
          thumbnail: getProperThumbnailUrl(video),
          channel: video.author,
          channelId: video.authorId,
          verified: video.authorVerified,
          views: formatViews(video.viewCount),
          uploadDate: new Date(video.published * 1000),
          duration: formatDuration(video.lengthSeconds),
          videoId: video.videoId,
          authorUrl: `/channel/${video.authorId}`
        });
      } else {
        filteredCount.value++;
      }
    }
    
    videos.value = filteredVideos;
  } catch (error) {
    console.error('Error loading videos:', error);
  } finally {
    isLoading.value = false;
  }
}

async function loadSubscriptionFeed() {
  isLoading.value = true;
  feedLoading.value = true;
  filteredCount.value = 0;
  
  try {
    const feedVideos = await subscriptionService.getSubscriptionFeed(50);
    const filteredVideos = [];
    
    for (const video of feedVideos) {
      const filterResult = await contentFilterService.shouldFilterVideo(video);
      if (!filterResult.filtered) {
        filteredVideos.push({
          title: video.title,
          url: `/watch?v=${video.videoId}`,
          thumbnail: getProperThumbnailUrl(video),
          channel: video.author,
          channelId: video.authorId,
          verified: video.authorVerified,
          views: formatViews(video.viewCount),
          uploadDate: new Date(video.published * 1000),
          duration: formatDuration(video.lengthSeconds),
          videoId: video.videoId,
          authorUrl: `/channel/${video.authorId}`
        });
      } else {
        filteredCount.value++;
      }
    }
    
    videos.value = filteredVideos;
  } catch (error) {
    console.error('Error loading subscription feed:', error);
  } finally {
    isLoading.value = false;
    feedLoading.value = false;
  }
}

function switchTab(tab) {
  activeTab.value = tab;
  videos.value = [];
  
  if (tab === 'popular') {
    loadPopularVideos();
  } else {
    loadSubscriptionFeed();
  }
}

async function searchVideos() {
  if (!searchQuery.value.trim()) {
    await loadPopularVideos();
    return;
  }
  
  isLoading.value = true;
  filteredCount.value = 0;
  
  try {
    const searchResults = await invidiousService.searchVideos(searchQuery.value);
    const filteredVideos = [];
    const filteredChannels = [];
    const filteredPlaylists = [];
    
    for (const item of searchResults) {
      const filterResult = await contentFilterService.shouldFilterVideo(item);
      if (filterResult.filtered) {
        filteredCount.value++;
        continue;
      }
      
      if (item.type === 'video') {
        filteredVideos.push({
          type: 'video',
          title: item.title,
          url: `/watch?v=${item.videoId}`,
          thumbnail: getProperThumbnailUrl(item),
          channel: item.author,
          verified: item.authorVerified,
          views: formatViews(item.viewCount),
          uploadDate: new Date(item.published * 1000),
          duration: formatDuration(item.lengthSeconds),
          videoId: item.videoId,
          authorUrl: `/channel/${item.authorId}`,
          ...item
        });
      } 
      else if (item.type === 'channel') {
        filteredChannels.push({
          type: 'channel',
          title: item.author,
          url: `/channel/${item.authorId}`,
          thumbnail: item.authorThumbnails?.[0]?.url || '',
          subscriberCount: item.subCount,
          videoCount: item.videoCount || 0,
          description: item.description || '',
          authorId: item.authorId,
          ...item
        });
      }
      else if (item.type === 'playlist') {
        filteredPlaylists.push({
          type: 'playlist',
          title: item.title,
          url: `/playlist/${item.playlistId}`,
          thumbnail: item.playlistThumbnail || `https://i.ytimg.com/vi/${item.videos?.[0]?.videoId || ''}/mqdefault.jpg`,
          channel: item.author,
          videoCount: item.videoCount || 0,
          playlistId: item.playlistId,
          ...item
        });
      }
    }
    
    const combinedResults = [
      ...filteredChannels,
      ...interleaveResults(filteredVideos, filteredPlaylists)
    ];
    
    videos.value = combinedResults;
  } catch (error) {
    console.error('Error searching:', error);
  } finally {
    isLoading.value = false;
  }
}

function interleaveResults(videos, playlists) {
  const result = [];
  const maxLength = Math.max(videos.length, playlists.length);
  
  let videoIndex = 0;
  let playlistIndex = 0;
  
  while (videoIndex < videos.length || playlistIndex < playlists.length) {
    for (let i = 0; i < 3 && videoIndex < videos.length; i++) {
      result.push(videos[videoIndex++]);
    }
    
    if (playlistIndex < playlists.length) {
      result.push(playlists[playlistIndex++]);
    }
  }
  
  return result;
}

function changeInstance() {
  invidiousService.setInstance(selectedInstance.value);
  loadPopularVideos();
}

function addInstance() {
  if (newInstanceUrl.value.trim()) {
    const result = invidiousService.addCustomInstance(newInstanceUrl.value);
    if (result.success) {
      newInstanceUrl.value = '';
    } else {
      alert(result.error);
    }
  }
}

function removeInstance(url) {
  const result = invidiousService.removeCustomInstance(url);
  if (!result.success) {
    alert(result.error);
  }
}

function isDefaultInstance(url) {
  return defaultInstances.includes(url);
}

onMounted(() => {
  if (route.query.search) {
    searchVideos();
  } else if (hasSubscriptions.value) {
    loadSubscriptionFeed();
  } else {
    activeTab.value = 'popular';
    loadPopularVideos();
  }
});

</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <div class="flex border-b border-gray-200 dark:border-gray-700 mb-6">
      <button 
        @click="switchTab('subscriptions')" 
        class="px-4 py-2 font-medium text-sm border-b-2 transition-colors"
        :class="activeTab === 'subscriptions' 
          ? 'border-red-500 text-red-600 dark:text-red-400' 
          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'"
      >
        Subscriptions
        <span 
          v-if="subscriptionService.getSubscriptions().length > 0"
          class="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full"
        >
          {{ subscriptionService.getSubscriptions().length }}
        </span>
      </button>
      
      <button 
        @click="switchTab('popular')" 
        class="px-4 py-2 font-medium text-sm border-b-2 transition-colors"
        :class="activeTab === 'popular' 
          ? 'border-red-500 text-red-600 dark:text-red-400' 
          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'"
      >
        Popular
      </button>
    </div>

    <div v-if="activeTab === 'subscriptions' && !hasSubscriptions && !isLoading" 
         class="bg-white dark:bg-gray-800 rounded-lg p-6 text-center mb-6">
      <h2 class="text-xl font-medium mb-2">No subscriptions yet</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-4">
        Subscribe to channels to see their latest videos here.
      </p>
      <button 
        @click="switchTab('popular')" 
        class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
      >
        Browse Popular Videos
      </button>
    </div>
    
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div v-for="i in 12" :key="i" class="bg-white dark:bg-gray-800 rounded-xl">
        <div class="relative">
          <div class="w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-t-xl animate-pulse"></div>
          <div class="absolute bottom-2 right-2 bg-black/80 w-10 h-5 rounded animate-pulse"></div>
        </div>
        <div class="p-4">
          <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1 animate-pulse"></div>
          <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
          
          <div class="mt-2 flex items-center">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
            <div class="w-4 h-4 ml-1 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
          </div>
          
          <div class="mt-1 h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
        </div>
      </div>
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div 
        v-for="item in videos" 
        :key="item.type + '-' + (item.videoId || item.authorId || item.playlistId)" 
        class="bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <NuxtLink v-if="item.type === 'channel'" :to="`/channel/${item.authorId}`" class="block p-4">
          <div class="flex items-center space-x-4">
            <nuxt-img
              :src="item.thumbnail"
              :alt="item.title"
              class="w-16 h-16 rounded-full"
              provider="ipx"
              format="webp"
              quality="90"
              loading="lazy"
            />
            <div class="flex-1">
              <h3 class="font-medium text-base line-clamp-1">{{ item.title }}</h3>
              <div class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {{ formatViews(item.subscriberCount) }} subscribers
              </div>
              <p v-if="item.description" class="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                {{ item.description }}
              </p>
            </div>
          </div>
        </NuxtLink>
        
        <NuxtLink v-else-if="item.type === 'playlist'" :to="`/playlist/${item.playlistId}`" class="block">
          <div class="relative">
            <nuxt-img
              :src="item.thumbnail"
              :alt="item.title"
              provider="ipx"
              loading="lazy"
              format="webp"
              quality="80"
              class="w-full aspect-video object-cover rounded-t-xl"
            />
            <div class="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div class="bg-white/20 p-2 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
            </div>
            <div class="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
              {{ item.videoCount }} videos
            </div>
          </div>
          <div class="p-4">
            <h3 class="font-medium text-base line-clamp-2">{{ item.title }}</h3>
            <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {{ item.channel }}
            </div>
          </div>
        </NuxtLink>
        
        <NuxtLink 
          v-else 
          :to="{ path: '/watch', query: { v: item.videoId } }" 
          class="block"
        >
          <div class="relative">
            <nuxt-img
              :src="item.thumbnail"
              :alt="item.title"
              provider="ipx"
              loading="lazy"
              format="webp"
              quality="80"
              class="w-full aspect-video object-cover rounded-t-xl"
            />
            <span class="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
              {{ item.duration }}
            </span>
          </div>
          <div class="p-4">
            <h3 class="font-medium text-base line-clamp-2">{{ item.title }}</h3>
            <div class="mt-2 flex items-center text-sm text-gray-600 dark:text-gray-400">
              <NuxtLink
                :to="`${item.authorUrl}`" 
                class="hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                {{ item.channel }}
              </NuxtLink>
              <svg v-if="item.verified" class="w-4 h-4 ml-1 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {{ item.views }} views • {{ timeAgo(item.uploadDate) }}
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
    
    <div 
      v-if="showFilteredMessage" 
      class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-center"
    >
      {{ filteredCount }} {{ filteredCount === 1 ? 'video was' : 'videos were' }} hidden by content filters
    </div>
    
    <div v-if="!isLoading && videos.length === 0 && activeTab !== 'subscriptions'" class="text-center py-8 text-gray-600 dark:text-gray-400">
      No videos found. Try a different search or instance.
    </div>
  </div>
</template>