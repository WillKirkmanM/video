<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { invidiousService, invidiousInstance } from "~/services/invidious";
import { contentFilterService } from "~/services/content-filter";
import { subscriptionService } from "~/services/subscription";

const route = useRoute();
const router = useRouter();

const playlistId = computed(() => route.params.id);

const playlist = ref(null);
const videos = ref([]);
const isLoading = ref(true);
const error = ref(null);
const filteredCount = ref(0);

const isSubscribed = computed(() => {
  if (!playlist.value?.authorId) return false;
  return subscriptionService.isSubscribed(playlist.value.authorId);
});

function getProperThumbnailUrl(video) {
  if (video.videoThumbnails?.length) {
    const thumbnail = video.videoThumbnails.find((t) => t.quality === "medium");
    if (thumbnail) {
      if (thumbnail.url.startsWith("/")) {
        return `${invidiousInstance.value}${thumbnail.url}`;
      }
      if (thumbnail.url.startsWith("http")) {
        return thumbnail.url;
      }
    }
  }
  return `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`;
}

function formatDuration(seconds) {
  if (!seconds) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatViews(viewCount) {
  if (!viewCount) return "0";

  const num = parseInt(viewCount);
  if (isNaN(num)) return "0";

  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }

  return viewCount.toString();
}

function toggleSubscription() {
  if (!playlist.value?.authorId) return;

  if (isSubscribed.value) {
    subscriptionService.unsubscribe(playlist.value.authorId);
  } else {
    subscriptionService.subscribe({
      authorId: playlist.value.authorId,
      author: playlist.value.author,
      authorThumbnails: playlist.value.authorThumbnails,
    });
  }
}

async function loadPlaylist() {
  if (!playlistId.value) {
    error.value = "No playlist ID provided";
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  error.value = null;
  filteredCount.value = 0;

  try {
    const playlistData = await invidiousService.getPlaylist(playlistId.value);
    playlist.value = playlistData;

    const filteredVideos = [];

    for (const video of playlistData.videos || []) {
      const filterResult = await contentFilterService.shouldFilterVideo(video);
      if (!filterResult.filtered) {
        filteredVideos.push({
          ...video,
          formattedDuration: formatDuration(video.lengthSeconds),
          thumbnail: getProperThumbnailUrl(video),
        });
      } else {
        filteredCount.value++;
      }
    }

    videos.value = filteredVideos;

    if (typeof document !== "undefined" && playlist.value?.title) {
      document.title = `${playlist.value.title} - Playlist`;
    }
  } catch (error) {
    console.error("Error loading playlist:", error);
    error.value =
      "Failed to load playlist. It might be unavailable or restricted.";
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadPlaylist();
});
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <div v-if="isLoading" class="animate-pulse">
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6"
      >
        <div class="h-40 bg-gray-200 dark:bg-gray-700"></div>
        <div class="p-6">
          <div
            class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"
          ></div>
          <div
            class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"
          ></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="i in 8"
          :key="i"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
        >
          <div class="h-40 bg-gray-200 dark:bg-gray-700"></div>
          <div class="p-4">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <div
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4"
      >
        <h3 class="text-lg font-medium text-red-800 dark:text-red-400">
          Error
        </h3>
        <p class="mt-2 text-red-700 dark:text-red-300">{{ error }}</p>
      </div>
      <router-link
        to="/"
        class="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Back to Home
      </router-link>
    </div>

    <div v-else-if="playlist">
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6"
      >
        <div class="md:flex">
          <div class="md:w-80 flex-shrink-0">
            <nuxt-img
              v-if="playlist.playlistThumbnail"
              :src="playlist.playlistThumbnail"
              :alt="playlist.title"
              class="w-full aspect-video object-cover"
              provider="ipx"
              format="webp"
              quality="85"
              width="320"
              height="180"
              loading="eager"
            />
            <div
              v-else
              class="w-full aspect-video bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
            >
              <span class="text-gray-500 dark:text-gray-400">No thumbnail</span>
            </div>
          </div>

          <div class="p-6">
            <h1 class="text-2xl font-bold mb-2">{{ playlist.title }}</h1>

            <div class="flex items-center mb-2">
              <router-link
                :to="`/channel/${playlist.authorId}`"
                class="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {{ playlist.author }}
              </router-link>
              <span v-if="playlist.authorVerified" class="ml-1 text-blue-500">
                <svg
                  class="w-4 h-4 inline"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                  />
                </svg>
              </span>
            </div>

            <div class="flex items-center justify-between mb-3">
              <div class="text-sm text-gray-600 dark:text-gray-400">
                {{ videos.length }} videos •
                {{ formatViews(playlist.viewCount) }} views
              </div>

              <button
                @click="toggleSubscription"
                class="px-4 py-1.5 rounded-full font-medium text-sm transition-colors"
                :class="
                  isSubscribed
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                    : 'bg-red-600 text-white hover:bg-red-700'
                "
              >
                {{ isSubscribed ? "Subscribed" : "Subscribe" }}
              </button>
            </div>

            <p
              v-if="playlist.description"
              class="text-sm text-gray-600 dark:text-gray-400 line-clamp-3"
            >
              {{ playlist.description }}
            </p>

            <div class="mt-4">
              <router-link
                :to="`/watch?v=${videos[0]?.videoId || ''}&list=${playlistId}`"
                class="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <svg
                  class="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  />
                </svg>
                Play All
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
      >
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="font-medium">Videos</h2>
        </div>

        <div class="divide-y divide-gray-200 dark:divide-gray-700">
          <div
            v-for="(video, index) in videos"
            :key="video.videoId"
            class="flex p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <div
              class="flex-shrink-0 w-10 mr-4 text-center text-gray-600 dark:text-gray-400"
            >
              {{ index + 1 }}
            </div>

            <div class="flex flex-1">
              <div class="relative w-40 md:w-60 flex-shrink-0 mr-4">
                <router-link
                  :to="`/watch?v=${video.videoId}&list=${playlistId}`"
                >
                  <nuxt-img
                    :src="video.thumbnail"
                    :alt="video.title"
                    class="w-full aspect-video object-cover rounded"
                    provider="ipx"
                    format="webp"
                    quality="80"
                    width="240"
                    height="135"
                    loading="lazy"
                  />
                  <span
                    class="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded"
                  >
                    {{ video.formattedDuration }}
                  </span>
                </router-link>
              </div>

              <div class="flex-1">
                <router-link
                  :to="`/watch?v=${video.videoId}&list=${playlistId}`"
                  class="font-medium line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {{ video.title }}
                </router-link>
                <div class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <router-link
                    :to="`/channel/${video.authorId}`"
                    class="hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {{ video.author }}
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="videos.length === 0"
          class="p-8 text-center text-gray-600 dark:text-gray-400"
        >
          <p v-if="filteredCount > 0">
            All videos in this playlist were filtered by your content settings.
          </p>
          <p v-else>This playlist has no videos.</p>
        </div>
      </div>

      <div
        v-if="filteredCount > 0"
        class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-center"
      >
        {{ filteredCount }}
        {{ filteredCount === 1 ? "video was" : "videos were" }} hidden by
        content filters
      </div>
    </div>
  </div>
</template>
