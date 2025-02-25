<template>
  <div class="container mx-auto px-4 py-6">
    <div v-if="channel" class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6">
      <div v-if="channel.authorBanners?.length" class="w-full h-48 relative">
        <img 
          :src="channel.authorBanners[0].url"
          :alt="channel.author"
          class="w-full h-full object-cover"
        />
      </div>
      
      <div class="p-6">
        <div class="flex items-start space-x-6">
          <img 
            v-if="channel.authorThumbnails?.length"
            :src="channel.authorThumbnails[channel.authorThumbnails.length - 1].url"
            :alt="channel.author"
            class="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800"
          />
          
          <div class="flex-1">
            <div class="flex items-center space-x-3">
              <h1 class="text-2xl font-bold">{{ channel.author }}</h1>
              <span v-if="channel.authorVerified" class="text-blue-500">
                <!-- <Icon name="mdi:check-decagram" class="w-6 h-6" /> -->
              </span>
            </div>
            
            <div class="mt-2 text-gray-600 dark:text-gray-400 space-y-1">
              <div>
                {{ formatSubscribers(channel.subCount) }} subscribers
                <span class="mx-2">•</span>
                {{ formatNumber(channel.totalViews) }} total views
              </div>
              <div>
                Joined {{ formatDate(channel.joined) }}
                <span v-if="channel.isFamilyFriendly" class="ml-2 text-green-600">
                  <!-- <Icon name="mdi:family" class="w-5 h-5 inline" /> -->
                  Family Friendly
                </span>
              </div>
            </div>
            
            <div v-if="channel.tags?.length" class="mt-4 flex flex-wrap gap-2">
              <span 
                v-for="tag in channel.tags" 
                :key="tag"
                class="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
              >
                {{ tag }}
              </span>
            </div>
            
            <div v-if="channel.description" class="mt-4">
              <details class="text-sm text-gray-700 dark:text-gray-300">
                <summary class="cursor-pointer font-medium">Description</summary>
                <div class="mt-2 whitespace-pre-wrap" v-html="channel.descriptionHtml"></div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6 animate-pulse">
      <div class="w-full h-48 bg-gray-200 dark:bg-gray-700"></div>
      <div class="p-6">
        <div class="flex items-start space-x-6">
          <div class="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700"></div>
          <div class="flex-1 space-y-4">
            <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div class="space-y-2">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
            <div class="space-y-2">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="videos.length" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <div 
        v-for="video in videos" 
        :key="video.videoId"
        class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <a :href="`/watch?v=${video.videoId}`">
          <div class="relative">
            <img 
              :src="getProperThumbnailUrl(video)"
              :alt="video.title"
              class="w-full aspect-video object-cover"
            />
            <div class="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
              {{ formatDuration(video.lengthSeconds) }}
            </div>
          </div>
          <div class="p-4">
            <h3 class="font-medium line-clamp-2">{{ video.title }}</h3>
            <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {{ video.viewCountText }}
              <span class="mx-1">•</span>
              {{ video.publishedText }}
            </div>
          </div>
        </a>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <div v-for="i in 12" :key="i" class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden animate-pulse">
        <div class="w-full aspect-video bg-gray-200 dark:bg-gray-700"></div>
        <div class="p-4 space-y-4">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
    </div>

    <div v-if="hasMore && !loading" class="mt-8 text-center">
      <button 
        class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full"
      >
        Load More
      </button>
    </div>

    <div v-if="!hasMore && videos.length > 0" class="mt-8 text-center text-gray-600">
      No more videos to load
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute } from '#app'
import { invidiousService } from '~/services/invidious'
import type { Channel, LatestVideo } from '~/types/invidious'

const route = useRoute()
const channelId = route.params.id

const channel = ref<Channel | null>(null)
const videos = ref<LatestVideo[]>([])
const page = ref(1)
const continuation = ref<string | null>(null)
const hasMore = ref(true)
const channelLoading = ref(true)
const videosLoading = ref(true)

const formatSubscribers = (count: number) => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString()
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const formatViews = (views: number) => {
  return new Intl.NumberFormat().format(views)
}

const getProperThumbnailUrl = (video: any) => {
  if (!video.videoThumbnails?.length) return ''
  return `https://inv.nadeko.net${video.videoThumbnails[0].url}`
}

const retryWithExponentialBackoff = async (fn: Function, retries = 3, delay = 1000) => {
  try {
    return await fn()
  } catch (error) {
    if (retries === 0) throw error
    await new Promise(resolve => setTimeout(resolve, delay))
    return retryWithExponentialBackoff(fn, retries - 1, delay * 2)
  }
}

const loadChannelInfo = async () => {
  try {
    channelLoading.value = true
    channel.value = await retryWithExponentialBackoff(() => invidiousService.getChannelDetails((channelId as any)))
  } catch (error) {
    console.error('Error loading channel:', error)
  } finally {
    channelLoading.value = false
  }
}

const loadChannelVideos = async () => {
  try {
    if (!hasMore.value) return
    videosLoading.value = true

    const previousContinuation = continuation.value
    const response = await retryWithExponentialBackoff(() => invidiousService.getChannelVideos((channelId as any), { continuation: continuation.value }))

    if (response.videos?.length) {
      videos.value = [...videos.value, ...response.videos]

      if (previousContinuation === response.continuation) {
        hasMore.value = false
      } else {
        continuation.value = response.continuation
        hasMore.value = !!response.continuation
      }
    } else {
      hasMore.value = false
    }
  } catch (error) {
    console.error('Error loading videos:', error)
    hasMore.value = false
  } finally {
    videosLoading.value = false
  }
}

const loading = computed(() => {
  return channelLoading.value || videosLoading.value
})

definePageMeta({
  validate: async (route: any) => {
    return /^[A-Za-z0-9_-]+$/.test(route.params.id)
  }
})

const { data: initialData } = useFetch<{
  channel: Channel;
  videosData: { videos: LatestVideo[]; continuation: string | null };
}>('/api/channel-data', {
  query: { channelId: channelId },
})

onMounted(async () => {
  channelLoading.value = true
  videosLoading.value = true

  try {
    if (initialData.value) {
      channel.value = initialData.value.channel
      videos.value = initialData.value.videosData.videos || []
      continuation.value = initialData.value.videosData.continuation
      hasMore.value = !!initialData.value.videosData.continuation
    } else {
      const [channelData, videosData] = await Promise.all([
        retryWithExponentialBackoff(() => invidiousService.getChannelDetails((channelId as any))),
        retryWithExponentialBackoff(() => invidiousService.getChannelVideos((channelId as any)))
      ])

      channel.value = channelData
      videos.value = videosData.videos || []
      continuation.value = videosData.continuation
      hasMore.value = !!videosData.continuation
    }
  } catch (error) {
    console.error('Error loading initial data:', error)
  } finally {
    channelLoading.value = false
    videosLoading.value = false
  }
})

watch(() => route.params.id, async (newId) => {
  if (newId) {
    page.value = 1
    videos.value = []
    continuation.value = null
    hasMore.value = true
    channelLoading.value = true
    videosLoading.value = true

    try {
      await Promise.all([
        loadChannelInfo(),
        loadChannelVideos()
      ])
    } finally {
      channelLoading.value = false
      videosLoading.value = false
    }
  }
})

const formatNumber = (count: number) => {
  return new Intl.NumberFormat().format(count)
}
</script>