<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { Clock, Trash2, X, Search, Filter, Calendar } from "lucide-vue-next";
import { invidiousInstance } from "~/services/invidious";

const router = useRouter();
const watchHistory = ref([]);
const isLoading = ref(true);
const showClearConfirm = ref(false);
const searchQuery = ref("");
const timePeriod = ref("all");
const sortBy = ref("newest");
const itemsPerPage = ref(20);
const currentPage = ref(1);

function formatDate(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
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

function applyTimePeriodFilter(items) {
  if (timePeriod.value === "all") {
    return items;
  }

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const thisWeekStart = today - now.getDay() * 24 * 60 * 60 * 1000;
  const thisMonthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).getTime();

  return items.filter((item) => {
    const timestamp = item.timestamp;

    if (timePeriod.value === "today") {
      return timestamp >= today;
    } else if (timePeriod.value === "week") {
      return timestamp >= thisWeekStart;
    } else if (timePeriod.value === "month") {
      return timestamp >= thisMonthStart;
    }

    return true;
  });
}

function applySearchFilter(items) {
  if (!searchQuery.value.trim()) {
    return items;
  }

  const query = searchQuery.value.toLowerCase().trim();

  return items.filter((item) => {
    return (
      item.title?.toLowerCase().includes(query) ||
      item.author?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  });
}

function applySorting(items) {
  return [...items].sort((a, b) => {
    if (sortBy.value === "newest") {
      return b.timestamp - a.timestamp;
    } else if (sortBy.value === "oldest") {
      return a.timestamp - b.timestamp;
    }
    return 0;
  });
}

watch([searchQuery, timePeriod, sortBy], () => {
  currentPage.value = 1;
});

const filteredHistory = computed(() => {
  let result = [...watchHistory.value];

  result = applyTimePeriodFilter(result);

  result = applySearchFilter(result);

  result = applySorting(result);

  return result;
});

const paginatedHistory = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage.value;
  const endIndex = startIndex + itemsPerPage.value;
  return filteredHistory.value.slice(startIndex, endIndex);
});

const totalPages = computed(() => {
  return Math.ceil(filteredHistory.value.length / itemsPerPage.value);
});

const historyByDate = computed(() => {
  const grouped = {};

  paginatedHistory.value.forEach((video) => {
    const date = formatDate(video.timestamp);
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(video);
  });

  return grouped;
});

function getProperThumbnailUrl(video) {
  if (video.thumbnail) {
    if (video.thumbnail.startsWith("/")) {
      return `${invidiousInstance.value}${video.thumbnail}`;
    }
    if (video.thumbnail.startsWith("http")) {
      return video.thumbnail;
    }
  }
  return `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`;
}

function loadWatchHistory() {
  isLoading.value = true;

  try {
    const rawHistory = localStorage.getItem("watchHistory");
    if (rawHistory) {
      watchHistory.value = JSON.parse(rawHistory);
    }
  } catch (error) {
    console.error("Failed to load watch history:", error);
    watchHistory.value = [];
  } finally {
    isLoading.value = false;
  }
}

function removeFromHistory(videoId) {
  watchHistory.value = watchHistory.value.filter(
    (item) => item.videoId !== videoId
  );
  saveWatchHistory();
}

function clearHistory() {
  watchHistory.value = [];
  saveWatchHistory();
  showClearConfirm.value = false;
}

function saveWatchHistory() {
  try {
    localStorage.setItem("watchHistory", JSON.stringify(watchHistory.value));
  } catch (error) {
    console.error("Failed to save watch history:", error);
  }
}

function exportHistory() {
  const dataStr = JSON.stringify(watchHistory.value, null, 2);
  const dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

  const exportFileDefaultName = `watch-history-${
    new Date().toISOString().split("T")[0]
  }.json`;

  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
}

function importHistory(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedHistory = JSON.parse(e.target.result);

      if (Array.isArray(importedHistory)) {
        const existing = new Set(watchHistory.value.map((v) => v.videoId));
        const newItems = importedHistory.filter(
          (v) => !existing.has(v.videoId)
        );

        watchHistory.value = [...watchHistory.value, ...newItems];
        saveWatchHistory();

        alert(
          `Successfully imported ${newItems.length} new items to your watch history.`
        );
      } else {
        alert("Invalid format. Expected a JSON array.");
      }
    } catch (error) {
      console.error("Failed to parse import file:", error);
      alert("Failed to import: Invalid JSON format");
    }
  };
  reader.readAsText(file);
}

onMounted(() => {
  loadWatchHistory();
});
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold flex items-center">
        <Clock class="h-6 w-6 mr-2" />
        Watch History
      </h1>

      <div class="flex space-x-2">
        <div v-if="watchHistory.length > 0" class="flex space-x-2">
          <button
            @click="exportHistory"
            class="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Export
          </button>

          <label
            class="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer text-sm"
          >
            Import
            <input
              type="file"
              accept=".json"
              class="hidden"
              @change="importHistory"
            />
          </label>
        </div>

        <button
          v-if="watchHistory.length > 0"
          @click="showClearConfirm = true"
          class="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center text-sm"
        >
          <Trash2 class="h-4 w-4 mr-1" />
          Clear
        </button>
      </div>
    </div>

    <div v-if="watchHistory.length > 0" class="mb-6">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div class="flex flex-col md:flex-row gap-4">
          <div class="flex-grow">
            <label class="text-sm text-gray-600 dark:text-gray-400 mb-1 block"
              >Search history</label
            >
            <div class="relative">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search by title, channel name..."
                class="w-full pl-10 pr-10 py-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
              <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>

          <div class="md:w-48">
            <label class="text-sm text-gray-600 dark:text-gray-400 mb-1 block"
              >Time period</label
            >
            <div class="relative">
              <select
                v-model="timePeriod"
                class="w-full pl-10 pr-8 py-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 appearance-none"
              >
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
              </select>
              <div
                class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div class="md:w-48">
            <label class="text-sm text-gray-600 dark:text-gray-400 mb-1 block"
              >Sort by</label
            >
            <div class="relative">
              <select
                v-model="sortBy"
                class="w-full pl-10 pr-8 py-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 appearance-none"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
              <div
                class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="filteredHistory.length !== watchHistory.length"
          class="mt-3 text-sm text-gray-600 dark:text-gray-400"
        >
          Showing {{ filteredHistory.length }} of
          {{ watchHistory.length }} watched videos
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="animate-pulse">
      <div
        v-for="i in 5"
        :key="i"
        class="mb-4 bg-white dark:bg-gray-800 rounded-lg p-4"
      >
        <div class="flex gap-4">
          <div class="w-40 h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div class="flex-1">
            <div
              class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"
            ></div>
            <div
              class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"
            ></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="watchHistory.length === 0" class="text-center py-12">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
        <Clock class="h-16 w-16 mx-auto text-gray-400" />
        <h2 class="text-xl font-medium mt-4 mb-2">
          Your watch history is empty
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Videos you watch will show up here so you can easily find them again.
        </p>
        <router-link
          to="/"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Browse Videos
        </router-link>
      </div>
    </div>

    <div
      v-else-if="filteredHistory.length === 0"
      class="bg-white dark:bg-gray-800 rounded-lg p-8 text-center"
    >
      <h2 class="text-xl font-medium mt-4 mb-2">No matching results</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-4">
        Try changing your search terms or filters
      </p>
      <button
        @click="
          searchQuery = '';
          timePeriod = 'all';
        "
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Clear Filters
      </button>
    </div>

    <div v-else class="space-y-6">
      <div v-for="(videos, date) in historyByDate" :key="date">
        <h2
          class="text-lg font-medium mb-3 border-b border-gray-200 dark:border-gray-700 pb-2"
        >
          {{ date }}
        </h2>

        <div class="space-y-4">
          <div
            v-for="video in videos"
            :key="video.videoId"
            class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div class="flex p-4">
              <div class="relative w-40 flex-shrink-0 mr-4">
                <router-link :to="`/watch?v=${video.videoId}`">
                  <nuxt-img
                    :src="getProperThumbnailUrl(video)"
                    :alt="video.title"
                    class="w-full aspect-video object-cover rounded"
                    provider="ipx"
                    format="webp"
                    quality="80"
                    width="160"
                    height="90"
                    loading="lazy"
                  />
                  <span
                    v-if="video.duration || video.lengthSeconds"
                    class="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded"
                  >
                    {{ video.duration || formatDuration(video.lengthSeconds) }}
                  </span>
                </router-link>
              </div>

              <div class="flex-1">
                <div class="flex justify-between">
                  <router-link
                    :to="`/watch?v=${video.videoId}`"
                    class="font-medium hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {{ video.title }}
                  </router-link>

                  <button
                    @click="removeFromHistory(video.videoId)"
                    class="text-gray-500 hover:text-red-600 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Remove from history"
                  >
                    <X class="h-4 w-4" />
                  </button>
                </div>

                <div class="text-sm text-gray-600 dark:text-gray-400">
                  <router-link
                    :to="`/channel/${video.authorId}`"
                    class="hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {{ video.author }}
                  </router-link>
                </div>

                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ formatViews(video.viewCount) }} views • Watched at
                  {{ formatTime(video.timestamp) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="flex justify-center mt-8">
        <nav class="inline-flex rounded-md shadow-sm" aria-label="Pagination">
          <button
            @click="currentPage = Math.max(1, currentPage - 1)"
            class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            :disabled="currentPage === 1"
          >
            Previous
          </button>

          <button
            v-for="page in totalPages"
            :key="page"
            @click="currentPage = page"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium"
            :class="
              page === currentPage
                ? 'z-10 border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            "
          >
            {{ page }}
          </button>

          <button
            @click="currentPage = Math.min(totalPages, currentPage + 1)"
            class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            :disabled="currentPage === totalPages"
          >
            Next
          </button>
        </nav>
      </div>
    </div>

    <div
      v-if="showClearConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
      >
        <h3 class="text-lg font-medium mb-4">Clear watch history?</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          This will permanently remove all videos from your watch history.
        </p>
        <div class="flex justify-end space-x-3">
          <button
            @click="showClearConfirm = false"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            @click="clearHistory"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Clear History
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
