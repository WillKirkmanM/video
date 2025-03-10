<script setup>
import { ThumbsUp, ThumbsDown, Settings } from "lucide-vue-next";
import { ref, onMounted, computed, watchEffect, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { invidiousService, invidiousInstance } from "~/services/invidious";
import { subscriptionService } from "~/services/subscription";
import { contentFilterService } from "~/services/content-filter";

const route = useRoute();
const router = useRouter();
const videoId = computed(() => route.query.v);
const startTime = computed(() => {
  const t = route.query.t || route.query.start_time;
  return t ? parseInt(t) : 0;
});

const videoData = ref(null);
const isLoading = ref(true);
const relatedVideos = ref([]);
const preferredQuality = ref("1080p");
const playerType = ref("dash");
const showQualityMenu = ref(false);
const forceHighQuality = ref(true);
const useDashUrl = ref(true);
const isDescriptionExpanded = ref(false);
const error = ref(null);
const usingFallbackEmbed = ref(false);

const youtubeFallbackUrl = computed(() => {
  if (!videoId.value) return "";
  let baseUrl = `https://www.youtube.com/embed/${videoId.value}?autoplay=1`;
  
  if (startTime.value > 0) {
    baseUrl += `&start=${startTime.value}`;
  }
  
  return baseUrl;
});

const isSubscribed = computed(() => {
  if (!videoData.value) return false;
  return subscriptionService.isSubscribed(videoData.value.authorId);
});

const qualityOptions = [
  "144p",
  "240p",
  "360p",
  "480p",
  "720p",
  "1080p",
  "1440p",
  "2160p",
];

const embedUrl = computed(() => {
  if (!videoId.value) return "";

  let baseUrl = `${invidiousInstance.value}/embed/${videoId.value}?autoplay=1&quality=dash`;

  if (startTime.value > 0) {
    baseUrl += `&start=${startTime.value}`;
  }

  if (playerType.value === "dash") {
    baseUrl += `&player_style=dash&quality=${preferredQuality.value}`;

    if (forceHighQuality.value) {
      baseUrl += "&high_quality=true&hd=true";
    }

    baseUrl += "&listen=0&raw=true&local=true";
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

function toggleComments() {
  showComments.value = !showComments.value;
  if (showComments.value && comments.value.length === 0) {
    fetchComments();
  }
}

function toggleCommentSort() {
  sortByTop.value = !sortByTop.value;
  comments.value = [];
  commentsContinuation.value = null;
  fetchComments();
}

function toggleSubscription() {
  if (!videoData.value) return;

  if (isSubscribed.value) {
    subscriptionService.unsubscribe(videoData.value.authorId);
  } else {
    subscriptionService.subscribe({
      authorId: videoData.value.authorId,
      author: videoData.value.author,
      authorThumbnails: videoData.value.authorThumbnails,
    });
  }
}

function togglePlayerType() {
  const types = ["dash", "legacy", "native"];
  const currentIndex = types.indexOf(playerType.value);
  const nextIndex = (currentIndex + 1) % types.length;
  playerType.value = types[nextIndex];

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("preferredPlayerType", playerType.value);
  }
}

function toggleUseDashUrl() {
  useDashUrl.value = !useDashUrl.value;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("useDashUrl", String(useDashUrl.value));
  }
}

function toggleForceHighQuality() {
  forceHighQuality.value = !forceHighQuality.value;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("forceHighQuality", String(forceHighQuality.value));
  }
}

function changeQuality(quality) {
  preferredQuality.value = quality;
  showQualityMenu.value = false;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("preferredQuality", quality);
  }
}

function toggleDescription() {
  isDescriptionExpanded.value = !isDescriptionExpanded.value;
}

function getProperThumbnailUrl(video) {
  if (video.videoThumbnails && video.videoThumbnails.length) {
    const thumbnail = video.videoThumbnails[0];
    if (thumbnail.url.startsWith("/")) {
      return `${invidiousInstance.value}${thumbnail.url}`;
    }
    if (thumbnail.url.startsWith("http")) {
      return thumbnail.url;
    }
  }
  return `${invidiousInstance.value}/vi/${video.videoId}/mqdefault.jpg`;
}

function formatViews(viewCount) {
  if (!viewCount) return "0";

  if (typeof viewCount === 'string' && viewCount.match(/[KMB]$/)) {
    return viewCount;
  }

  const num = typeof viewCount === 'string' ? 
    parseInt(viewCount.replace(/,/g, '')) : 
    viewCount;

  if (isNaN(num)) return "0";

  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + "B";
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + "K";
  }

  return new Intl.NumberFormat().format(num);
}

function formatDate(timestamp) {
  return new Date(timestamp * 1000).toLocaleDateString();
}

function navigateToVideo(video) {
  router.push({
    path: "/watch",
    query: { v: video.videoId },
  });

  window.scrollTo(0, 0);
}

function saveToWatchHistory() {
  if (!videoData.value || !videoId.value) return;

  try {
    const history = JSON.parse(localStorage.getItem("watchHistory") || "[]");

    const filteredHistory = history.filter(
      (item) => item.videoId !== videoId.value
    );

    filteredHistory.unshift({
      videoId: videoId.value,
      title: videoData.value.title,
      author: videoData.value.author,
      authorId: videoData.value.authorId,
      thumbnail: videoData.value.videoThumbnails?.[0]?.url || "",
      viewCount: videoData.value.viewCount,
      timestamp: Date.now(),
    });

    const limitedHistory = filteredHistory.slice(0, 50);

    localStorage.setItem("watchHistory", JSON.stringify(limitedHistory));
  } catch (err) {
    console.error("Failed to save to watch history:", err);
  }
}

let dashPlayer = null;

function setupDashPlayer() {
  if (playerType.value !== "native" || !directDashUrl.value) return;

  setTimeout(() => {
    const videoElement = document.getElementById("dash-video-player");
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
            autoSwitchBitrate: { audio: true, video: true },
          },
        },
      });

      if (startTime.value > 0) {
        videoElement.currentTime = startTime.value;
      }
    }
  }, 100);
}

async function fetchYouTubeMetadata(videoId) {
  try {
    const response = await fetch(`/api/youtube-metadata?videoId=${videoId}`);
    if (!response.ok) throw new Error('Failed to fetch metadata from server');
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    
    return data;
  } catch (err) {
    console.error('Error fetching YouTube metadata:', err);
    return null;
  }
}

async function loadVideo() {
  if (!videoId.value) {
    error.value = "No video ID provided";
    isLoading.value = false;
    return;
  }

  error.value = null;
  isLoading.value = true;
  usingFallbackEmbed.value = false;

  try {
    videoData.value = await invidiousService.getVideoDetails(videoId.value);

    if (videoData.value?.recommendedVideos) {
      relatedVideosFiltered.value = 0;
      const filteredVideos = [];
      
      for (const video of videoData.value.recommendedVideos) {
        const filterResult = await contentFilterService.shouldFilterVideo(video);
        if (!filterResult.filtered) {
          filteredVideos.push(video);
        } else {
          relatedVideosFiltered.value++;
        }
      }
      
      relatedVideos.value = filteredVideos;
    }

    if (playerType.value === "native") {
      setupDashPlayer();
    }

    saveToWatchHistory();

    if (typeof document !== "undefined" && videoData.value?.title) {
      document.title = `${videoData.value.title} - ParsonLabs Video`;
    }
  } catch (err) {
    console.error("Error loading video:", err);
    
    if (err.toString().includes("login") || 
        err.toString().includes("unavailable") || 
        err.status === 403 || 
        err.toString().includes("401") ||
        err.isCorsError === true ||
        err.message === "Failed to fetch") {
      
      console.log("Using YouTube embed fallback due to API access issue");
      usingFallbackEmbed.value = true;
      error.value = null;
      
      const ytMetadata = await fetchYouTubeMetadata(videoId.value);
      
      if (ytMetadata) {
        videoData.value = ytMetadata;
        relatedVideos.value = [];
      } else {
        videoData.value = {
          videoId: videoId.value,
          title: "Video Available via YouTube Embed",
          viewCount: "N/A", 
          publishedText: "N/A",
          author: "Unknown",
          likeCount: "N/A",
          dislikeCount: "N/A", 
          subCountText: "N/A",
          description: "This video requires login or has CORS restrictions. Using YouTube embed as fallback."
        };
      }
    } else {
      error.value = "Failed to load video. It might be unavailable or restricted.";
      videoData.value = null;
    }
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => videoId.value,
  () => {
    loadVideo();

    if (showComments.value) {
      comments.value = [];
      commentsFiltered.value = 0;
      commentsContinuation.value = null;
      fetchComments();
    }
  },
  { immediate: false }
);

watchEffect(() => {
  if (videoData.value && playerType.value === "native") {
    setupDashPlayer();
  }
});

const comments = ref([]);
const commentsLoading = ref(false);
const commentsContinuation = ref(null);
const sortByTop = ref(true);
const showComments = ref(true);

const relatedVideosFiltered = ref(0);
const commentsFiltered = ref(0);

async function fetchComments(continuation = null) {
  if (!videoId.value) return;

  commentsLoading.value = true;

  try {
    const params = {
      sort_by: sortByTop.value ? "top" : "new",
    };

    if (continuation) {
      params.continuation = continuation;
    }

    const response = await invidiousService.getComments(videoId.value, params);
    
    const filteredComments = [];
    let newFilteredCount = 0;
    
    if (response.comments) {
      for (const comment of response.comments) {
        const filterResult = await contentFilterService.shouldFilterVideo({
          title: comment.content,
          author: comment.author
        });
        
        if (!filterResult.filtered) {
          filteredComments.push(comment);
        } else {
          newFilteredCount++;
        }
      }
    }

    if (continuation) {
      comments.value = [...comments.value, ...filteredComments];
    } else {
      comments.value = filteredComments;
      commentsFiltered.value = 0;
    }
    
    commentsFiltered.value += newFilteredCount;
    commentsContinuation.value = response.continuation;
  } catch (error) {
    console.error("Error fetching comments:", error);
  } finally {
    commentsLoading.value = false;
  }
}

function formatTextWithTimestamps(text) {
  if (!text) return "";

  const escapedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const timestampRegex = /(\d+:)?(\d+):(\d{2})/g;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const textWithLinks = escapedText.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${url}</a>`;
  });

  return textWithLinks.replace(timestampRegex, (match) => {
    const parts = match.split(":").map((part) => parseInt(part));
    let seconds = 0;

    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else {
      seconds = parts[0] * 60 + parts[1];
    }

    return `<span class="timestamp cursor-pointer text-blue-500" data-time="${seconds}">${match}</span>`;
  });
}

function jumpToTimestamp(seconds) {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  if (playerType.value === "native") {
    const videoElement = document.getElementById("dash-video-player");
    if (videoElement) {
      videoElement.currentTime = seconds;

      videoElement
        .play()
        .catch((err) => console.error("Error playing video:", err));
    }
  } else {
    router.push({
      path: "/watch",
      query: {
        ...route.query,
        t: seconds,
      },
    });

    setTimeout(() => {
      const iframe = document.querySelector("iframe");
      if (iframe) {
        iframe.src = iframe.src;
      }
    }, 100);
  }
}

function setupTimestampListeners() {
  setTimeout(() => {
    const timestamps = document.querySelectorAll(".timestamp");
    timestamps.forEach((el) => {
      el.removeEventListener("click", timestampClickHandler);

      el.addEventListener("click", timestampClickHandler);
    });
  }, 100);
}

function timestampClickHandler(e) {
  const seconds = parseInt(e.target.dataset.time);
  jumpToTimestamp(seconds);
}

watch(
  () => isDescriptionExpanded.value,
  () => {
    setupTimestampListeners();
  }
);

onMounted(() => {
  if (!window.dashjs) {
    const script = document.createElement("script");
    script.src = "https://cdn.dashjs.org/latest/dash.all.min.js";
    script.onload = () => {
      console.log("dash.js loaded");
      if (playerType.value === "native" && videoData.value) {
        setupDashPlayer();
      }
    };
    document.head.appendChild(script);
  }

  if (typeof localStorage !== "undefined") {
    const savedPlayerType = localStorage.getItem("preferredPlayerType");
    const savedQuality = localStorage.getItem("preferredQuality");
    const savedForceHighQuality = localStorage.getItem("forceHighQuality");
    const savedUseDashUrl = localStorage.getItem("useDashUrl");

    if (savedPlayerType) {
      playerType.value = savedPlayerType;
    }

    if (savedQuality) {
      preferredQuality.value = savedQuality;
    }

    if (savedForceHighQuality !== null) {
      forceHighQuality.value = savedForceHighQuality === "true";
    }

    if (savedUseDashUrl !== null) {
      useDashUrl.value = savedUseDashUrl === "true";
    }
  }

  loadVideo();

  if (showComments.value) {
    fetchComments();
  }
});
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <div
      v-if="isLoading"
      class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse"
    ></div>

    <div v-else-if="error || !videoData" class="text-center py-8">
      <div
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4"
      >
        <h3 class="text-lg font-medium text-red-800 dark:text-red-400">
          Error
        </h3>
        <p class="mt-2 text-red-700 dark:text-red-300">
          {{ error || "Video not found or unavailable." }}
        </p>
      </div>
      <router-link
        to="/"
        class="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Back to Home
      </router-link>
    </div>

    <div v-else :class="{
      'grid grid-cols-1 lg:grid-cols-3 gap-6': relatedVideos.length > 0,
      'max-w-4xl mx-auto': relatedVideos.length === 0
    }">
      <div :class="{
        'lg:col-span-2': relatedVideos.length > 0
      }">
        <div class="relative">
          <div class="aspect-video bg-black rounded-sm overflow-hidden">
            <video
              v-if="playerType === 'native' && directDashUrl && !usingFallbackEmbed"
              id="dash-video-player"
              class="w-full h-full rounded-xl"
              controls
              autoplay
              :src="directDashUrl"
            ></video>

            <iframe
              v-else-if="usingFallbackEmbed"
              :src="youtubeFallbackUrl"
              class="w-full h-full rounded-xl"
              frameborder="0"
              allowfullscreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            ></iframe>

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
              {{ videoData.viewCount !== 'N/A' ? `${formatViews(videoData.viewCount)} views •` : '' }}
              {{ videoData.publishedText }}
            </div>

            <div class="flex space-x-4">
              <button v-if="videoData.likeCount !== 'N/A'" class="flex items-center gap-1">
                <ThumbsUp class="w-5 h-5" />
                {{ formatViews(videoData.likeCount) }}
              </button>
            </div>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-between pb-4 border-b">
          <div class="flex items-center">
            <template v-if="videoData.authorId && videoData.author !== 'Unknown'">
              <nuxt-img
                v-if="videoData.authorThumbnails?.[0]?.url"
                :src="videoData.authorThumbnails[0].url"
                class="w-12 h-12 rounded-full"
                :alt="videoData.author"
                provider="ipx"
                format="webp"
                quality="90"
                width="48"
                height="48"
              />
              <div v-else class="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <span>{{ videoData.author[0] }}</span>
              </div>
              <div class="ml-3">
                <a :href="`/channel/${videoData.authorId}`" class="hover:underline">
                  <div class="font-medium">{{ videoData.author }}</div>
                </a>
                <div v-if="videoData.subCountText && videoData.subCountText !== 'N/A'" 
                     class="text-sm text-gray-600 dark:text-gray-400">
                  {{ videoData.subCountText }} Subscribers
                </div>
              </div>
            </template>
          </div>
          
          <button
            v-if="videoData.authorId"
            @click="toggleSubscription"
            :class="{
              'bg-gray-200 dark:bg-gray-700': isSubscribed,
              'bg-red-600 text-white': !isSubscribed
            }"
            class="px-4 py-2 rounded-full font-medium hover:opacity-90"
          >
            {{ isSubscribed ? 'Subscribed' : 'Subscribe' }}
          </button>
        </div>

        <div v-if="videoData.description" class="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div>
            <p
              class="whitespace-pre-line text-sm"
              :class="{ 'line-clamp-4': !isDescriptionExpanded }"
              v-html="formatTextWithTimestamps(videoData.description)"
            ></p>
            <button
              @click="toggleDescription"
              class="mt-2 text-blue-500 text-sm font-medium hover:underline"
            >
              Show {{ isDescriptionExpanded ? "less" : "more" }}
            </button>
          </div>
        </div>

        <div class="mt-6">
          <button
            @click="toggleComments"
            class="flex items-center gap-2 font-medium mb-4"
          >
            <span class="text-lg">{{
              showComments ? "Hide comments" : "Show comments"
            }}</span>
            <svg
              class="w-5 h-5 transition-transform"
              :class="{ 'rotate-180': !showComments }"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19 9L12 16L5 9"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <div v-if="showComments" class="space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-medium">
                {{
                  videoData.commentCount
                    ? formatViews(videoData.commentCount) + " comments"
                    : "Comments"
                }}
              </h3>

              <div class="flex items-center">
                <button
                  @click="toggleCommentSort"
                  class="flex items-center gap-1 px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 9L12 18L21 9"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  {{ sortByTop ? "Top comments" : "Newest first" }}
                </button>
              </div>
            </div>

            <div
              v-if="commentsLoading && comments.length === 0"
              class="animate-pulse space-y-4"
            >
              <div v-for="i in 3" :key="i" class="flex gap-3">
                <div
                  class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"
                ></div>
                <div class="flex-1">
                  <div
                    class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"
                  ></div>
                  <div
                    class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1"
                  ></div>
                  <div
                    class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"
                  ></div>
                </div>
              </div>
            </div>

            <div
              v-else-if="!commentsLoading && comments.length === 0"
              class="py-8 text-center text-gray-600 dark:text-gray-400"
            >
              <p>No comments available for this video.</p>
            </div>

            <div v-else class="space-y-6">
              <div
                v-for="comment in comments"
                :key="comment.commentId"
                class="flex gap-3"
              >
                <nuxt-img
                  v-if="
                    comment.authorThumbnails && comment.authorThumbnails.length
                  "
                  :src="comment.authorThumbnails[0].url"
                  :alt="comment.author"
                  class="w-10 h-10 rounded-full"
                  provider="ipx"
                  format="webp"
                  quality="80"
                  width="40"
                  height="40"
                  loading="lazy"
                />
                <div
                  v-else
                  class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center"
                >
                  <span class="text-sm">{{
                    comment.author?.charAt(0) || "?"
                  }}</span>
                </div>

                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium">{{ comment.author }}</span>
                    <span
                      v-if="comment.authorIsChannelOwner"
                      class="bg-gray-200 dark:bg-gray-700 text-xs px-2 py-0.5 rounded-full"
                    >
                      Author
                    </span>
                    <span class="text-xs text-gray-600 dark:text-gray-400">
                      {{ comment.publishedText }}
                    </span>
                  </div>

                  <div
                    class="text-sm whitespace-pre-line mb-2"
                    v-html="formatTextWithTimestamps(comment.content)"
                  ></div>

                  <div
                    class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <div class="flex items-center gap-1">
                      <ThumbsUp class="w-4 h-4" />
                      {{ formatViews(comment.likeCount) }}
                    </div>

                    <div
                      v-if="comment.replyCount"
                      class="flex items-center gap-1"
                    >
                      <span
                        >{{ comment.replyCount }}
                        {{
                          comment.replyCount === 1 ? "reply" : "replies"
                        }}</span
                      >
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="commentsContinuation" class="text-center pt-4">
                <button
                  @click="loadMoreComments"
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500"
                  :disabled="commentsLoading"
                >
                  <span v-if="commentsLoading">Loading...</span>
                  <span v-else>Load more comments</span>
                </button>
              </div>
            
              <div 
                v-if="commentsFiltered > 0" 
                class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-center text-sm"
              >
                {{ commentsFiltered }} {{ commentsFiltered === 1 ? 'comment was' : 'comments were' }} hidden by content filters
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="relatedVideos.length > 0">
        <h3 class="text-lg font-medium mb-4">Related videos</h3>
        <div class="space-y-4">
          <div
            v-for="video in relatedVideos"
            :key="video.videoId"
            @click="navigateToVideo(video)"
            class="flex gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded cursor-pointer"
          >
            <div class="relative w-40 flex-shrink-0">
              <nuxt-img
                :src="getProperThumbnailUrl(video)"
                class="w-full aspect-video object-cover rounded"
                :alt="video.title"
                provider="ipx"
                format="webp"
                quality="80"
                width="160"
                height="90"
                loading="lazy"
              />
              <span
                class="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded"
              >
                {{
                  video.lengthSeconds
                    ? Math.floor(video.lengthSeconds / 60) +
                      ":" +
                      (video.lengthSeconds % 60).toString().padStart(2, "0")
                    : "0:00"
                }}
              </span>
            </div>
            <div class="flex-1">
              <h4 class="font-medium text-sm line-clamp-2">
                {{ video.title }}
              </h4>
              <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {{ video.author }}
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {{ video.viewCountText }} Views
              </div>
            </div>
          </div>
        
          <div 
            v-if="relatedVideosFiltered > 0" 
            class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-center text-sm"
          >
            {{ relatedVideosFiltered }} {{ relatedVideosFiltered === 1 ? 'video was' : 'videos were' }} hidden by content filters
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timestamp {
  @apply text-blue-600 dark:text-blue-400 hover:underline cursor-pointer;
}

:deep(.timestamp) {
  @apply text-blue-600 dark:text-blue-400 hover:underline cursor-pointer;
}
</style>
