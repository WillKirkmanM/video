<script setup>
import { ThumbsUp, ThumbsDown, Settings } from "lucide-vue-next"
import { ref, onMounted, computed, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { invidiousService, invidiousInstance } from '~/services/invidious';

const route = useRoute();
const videoId = computed(() => route.query.v);
const videoData = ref(null);
const isLoading = ref(true);
const relatedVideos = ref([]);
const preferredQuality = ref('1080p');
const playerType = ref('dash');
const showQualityMenu = ref(false);
const forceHighQuality = ref(true);
const useDashUrl = ref(true);
const isDescriptionExpanded = ref(false);

const qualityOptions = [
  '144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p'
];

const embedUrl = computed(() => {
  let baseUrl = `${invidiousInstance.value}/embed/${videoId.value}?autoplay=1`;
  
  if (playerType.value === 'dash') {
    baseUrl += `&player_style=dash&quality=${preferredQuality.value}`;
    
    if (forceHighQuality.value) {
      baseUrl += '&high_quality=true&hd=true';
    }
    
    baseUrl += '&listen=0&raw=true&local=true';
  }
  
  return baseUrl;
});

const directDashUrl = computed(() => {
  if (videoData.value?.dashUrl) {
    return videoData.value.dashUrl;
  }
  return null;
});

const directVideoUrl = computed(() => {
  return `${invidiousInstance.value}/watch?v=${videoId.value}&quality=${preferredQuality.value}&player_style=dash`;
});

function togglePlayerType() {
  const types = ['dash', 'legacy', 'native'];
  const currentIndex = types.indexOf(playerType.value);
  const nextIndex = (currentIndex + 1) % types.length;
  playerType.value = types[nextIndex];
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('preferredPlayerType', playerType.value);
  }
}

function toggleUseDashUrl() {
  useDashUrl.value = !useDashUrl.value;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('useDashUrl', String(useDashUrl.value));
  }
}

function toggleForceHighQuality() {
  forceHighQuality.value = !forceHighQuality.value;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('forceHighQuality', forceHighQuality.value);
  }
}

function changeQuality(quality) {
  preferredQuality.value = quality;
  showQualityMenu.value = false;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('preferredQuality', quality);
  }
}

function toggleDescription() {
  isDescriptionExpanded.value = !isDescriptionExpanded.value;
}

function getProperThumbnailUrl(video) {
  if (video.videoThumbnails && video.videoThumbnails.length) {
    const thumbnail = video.videoThumbnails[0];
    if (thumbnail.url.startsWith('/')) {
      return `${invidiousInstance.value}${thumbnail.url}`;
    }
    if (thumbnail.url.startsWith('http')) {
      return thumbnail.url;
    }
  }
  return `${invidiousInstance.value}/vi/${video.videoId}/mqdefault.jpg`;
}

function formatViews(viewCount) {
  if (!viewCount) return '0';
  
  const num = parseInt(viewCount);
  if (isNaN(num)) return '0';
  
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  
  return new Intl.NumberFormat().format(num);
}

function formatDate(timestamp) {
  return new Date(timestamp * 1000).toLocaleDateString();
}

let dashPlayer = null;

function setupDashPlayer() {
  if (playerType.value !== 'native' || !directDashUrl.value) return;
  
  setTimeout(() => {
    const videoElement = document.getElementById('dash-video-player');
    if (!videoElement) return;
    
    if (dashPlayer) {
      dashPlayer.destroy();
      dashPlayer = null;
    }
    
    if (window.dashjs) {
      dashPlayer = window.dashjs.MediaPlayer().create();
      dashPlayer.initialize(videoElement, directDashUrl.value, true);
      dashPlayer.updateSettings({
        streaming: {
          fastSwitchEnabled: true,
          lowLatencyEnabled: true,
          abr: {
            useDefaultABRRules: true,
            initialBitrate: { video: 5000 },
            autoSwitchBitrate: { audio: true, video: true }
          }
        }
      });
    }
  }, 100);
}

async function loadVideo() {
  if (!videoId.value) return;
  
  isLoading.value = true;
  try {
    videoData.value = await invidiousService.getVideoDetails(videoId.value);
    if (videoData.value?.recommendedVideos) {
      relatedVideos.value = videoData.value.recommendedVideos;
    }
    
    if (playerType.value === 'native') {
      setupDashPlayer();
    }
  } catch (error) {
    console.error('Error loading video:', error);
  } finally {
    isLoading.value = false;
  }
}

watchEffect(() => {
  if (videoData.value && playerType.value === 'native') {
    setupDashPlayer();
  }
});

onMounted(() => {
  if (!window.dashjs) {
    const script = document.createElement('script');
    script.src = 'https://cdn.dashjs.org/latest/dash.all.min.js';
    script.onload = () => {
      console.log('dash.js loaded');
      if (playerType.value === 'native' && videoData.value) {
        setupDashPlayer();
      }
    };
    document.head.appendChild(script);
  }
  
  if (typeof localStorage !== 'undefined') {
    const savedPlayerType = localStorage.getItem('preferredPlayerType');
    const savedQuality = localStorage.getItem('preferredQuality');
    const savedForceHighQuality = localStorage.getItem('forceHighQuality');
    const savedUseDashUrl = localStorage.getItem('useDashUrl');
    
    if (savedPlayerType) {
      playerType.value = savedPlayerType;
    }
    
    if (savedQuality) {
      preferredQuality.value = savedQuality;
    }
    
    if (savedForceHighQuality !== null) {
      forceHighQuality.value = savedForceHighQuality === 'true';
    }
    
    if (savedUseDashUrl !== null) {
      useDashUrl.value = savedUseDashUrl === 'true';
    }
  }
  
  loadVideo();
});
</script>
<template>
  <div class="container mx-auto px-4 py-6">
    <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
      <div class="lg:col-span-2">
        <div class="aspect-video bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        
        <div class="mt-4 h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        
        <div class="flex justify-between mt-4">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div class="flex space-x-4">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
        </div>
        
        <div class="mt-6 flex items-center pb-4 border-b border-gray-200 dark:border-gray-700">
          <div class="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
          <div class="ml-3">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            <div class="h-3 mt-1 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
          <div class="ml-auto w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
        
        <div class="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div class="space-y-2">
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
      
      <div>
        <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
        <div class="space-y-4">
          <div v-for="i in 10" :key="i" class="flex gap-2">
            <div class="w-40 aspect-video bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div class="flex-1">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div class="h-3 mt-2 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              <div class="h-3 mt-1 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else-if="!videoData" class="text-center py-8">
      Video not found or unavailable.
    </div>
    
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <div class="relative">
          <div class="aspect-video bg-black rounded-sm overflow-hidden">
            <video 
              v-if="playerType === 'native' && directDashUrl"
              id="dash-video-player"
              class="w-full h-full rounded-xl"
              controls
              autoplay
              :src="directDashUrl"
            ></video>
            
            <iframe 
              v-else
              :src="embedUrl" 
              class="w-full h-full rounded-xl" 
              frameborder="0" 
              allowfullscreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            ></iframe>
          </div>
        </div>
        
        <div class="mt-4">
          <h1 class="text-xl font-bold">{{ videoData.title }}</h1>
          <div class="flex justify-between mt-2">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              {{ formatViews(videoData.viewCount) }} views • {{ videoData.publishedText }}
            </div>
            
            <div class="flex space-x-4">
              <button class="flex items-center gap-1">
                <ThumbsUp class="w-5 h-5" />
                {{ formatViews(videoData.likeCount) }}
              </button>
              
              <button class="flex items-center gap-1">
                <ThumbsDown class="w-5 h-5" />
                {{ formatViews(videoData.dislikeCount) }}
              </button>
            </div>
          </div>
        </div>
        
        <div class="mt-6 flex items-center pb-4 border-b">
          <img 
            :src="videoData.authorThumbnails?.[0]?.url ? videoData.authorThumbnails[0].url.split('=')[0] : ''"
            class="w-12 h-12 rounded-full" 
            :alt="videoData.author"
          />
          <div class="ml-3">
            <a :href="videoData.authorUrl">
              <div class="font-medium">{{ videoData.author }}</div>
            </a>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              {{ videoData.subCountText }} subscribers
            </div>
          </div>
          <button class="ml-auto bg-red-600 text-white px-4 py-2 rounded-full">
            Subscribe
          </button>
        </div>
        
        <div class="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div v-if="videoData.description">
            <p 
              class="whitespace-pre-line text-sm"
              :class="{'line-clamp-4': !isDescriptionExpanded}"
            >
              {{ videoData.description }}
            </p>
            <button 
              @click="toggleDescription" 
              class="mt-2 text-blue-500 text-sm font-medium hover:underline"
            >
              Show {{ isDescriptionExpanded ? 'less' : 'more' }}
            </button>
          </div>
        </div>
      </div>
      
      <div>
        <h3 class="text-lg font-medium mb-4">Related videos</h3>
        <div class="space-y-4">
          <a 
            v-for="video in relatedVideos" 
            :key="video.videoId" 
            :href="`/watch?v=${video.videoId}`"
            class="flex gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded"
          >
            <div class="relative w-40 flex-shrink-0">
              <img 
                :src="getProperThumbnailUrl(video)"
                class="w-full aspect-video object-cover rounded"
                :alt="video.title"
              />
              <span class="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                {{ video.lengthSeconds ? Math.floor(video.lengthSeconds / 60) + ':' + (video.lengthSeconds % 60).toString().padStart(2, '0') : '0:00' }}
              </span>
            </div>
            <div class="flex-1">
              <h4 class="font-medium text-sm line-clamp-2">{{ video.title }}</h4>
              <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {{ video.author }} 
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {{ video.viewCountText }} Views
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>