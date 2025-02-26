<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6">
      <div class="p-6">
        <h1 class="text-2xl font-bold mb-4">Settings</h1>

        <div class="mb-8">
          <h2 class="text-xl font-bold mb-4">Invidious Instance Settings</h2>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Instance
            </label>
            <div class="flex gap-2">
              <select 
                v-model="selectedInstance"
                @change="changeInstance"
                class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option v-for="instance in instances" :key="instance" :value="instance">
                  {{ getHostname(instance) }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-medium mb-3">Manage Instances</h3>
            
            <div class="flex gap-2 mb-4">
              <input
                v-model="newInstanceUrl"
                placeholder="Add new instance (e.g., invidious.io)"
                class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                @click="addInstance"
                class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Add
              </button>
            </div>
            
            <div class="space-y-2">
              <div v-for="instance in instances" :key="instance" 
                   class="flex items-center justify-between p-2 rounded-md" 
                   :class="instance === invidiousInstance ? 'bg-red-100 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-700/30'">
                <div class="flex items-center">
                  <span class="font-medium">{{ getHostname(instance) }}</span>
                  <span v-if="isDefaultInstance(instance)" class="ml-2 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">Default</span>
                  <span v-if="instance === invidiousInstance" class="ml-2 text-xs bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">Active</span>
                </div>
                <button
                  v-if="!isDefaultInstance(instance)"
                  @click="removeInstance(instance)"
                  class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 focus:outline-none"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mb-8">
          <h2 class="text-xl font-semibold mb-3">Content Filtering</h2>
          
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
            <h3 class="text-lg font-medium mb-2">Banned Words</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Videos containing these words (or similar words using Levenshtein distance) will be hidden.
            </p>
            
            <div class="flex gap-2 mb-4">
              <input
                v-model="newBannedWord"
                placeholder="Add word to ban..."
                class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                @keyup.enter="addBannedWord"
              />
              <button
                @click="addBannedWord"
                class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Add
              </button>
            </div>
            
            <div class="mb-4">
              <label class="flex items-center justify-between">
                <span>Levenshtein Distance Threshold: {{ levenshteinThreshold }}</span>
                <input
                  v-model.number="levenshteinThreshold"
                  type="range"
                  min="0"
                  max="3"
                  step="1"
                  class="w-1/2"
                />
              </label>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Higher values will catch more similar words. 0 means exact matches only.
              </p>
            </div>
            
            <div class="space-y-2">
              <div 
                v-for="(word, index) in bannedWords" 
                :key="index" 
                class="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-md"
              >
                <span class="font-medium">{{ word }}</span>
                <button 
                  @click="removeBannedWord(index)" 
                  class="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"
                >
                  Remove
                </button>
              </div>
              
              <div v-if="!bannedWords.length" class="text-sm text-gray-500 dark:text-gray-400 italic">
                No words banned yet
              </div>
            </div>
          </div>

          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
            <h3 class="text-lg font-medium mb-2">Banned Channels</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              All videos from these channels will be hidden.
            </p>
            
            <div class="mb-4">
              <label class="block text-sm font-medium mb-1">Search for channels</label>
              <div class="flex gap-2 mb-2">
                <input
                  v-model="channelSearchQuery"
                  placeholder="Search for channels..."
                  class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  @click="searchChannels"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :disabled="isSearchingChannels"
                >
                  <span v-if="isSearchingChannels">Searching...</span>
                  <span v-else>Search</span>
                </button>
              </div>
            </div>
            
            <div v-if="channelSearchResults.length > 0" class="mb-4 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
              <div 
                v-for="channel in channelSearchResults" 
                :key="channel.authorId"
                class="flex items-center justify-between p-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
              >
                <div class="flex items-center">
                  <nuxt-img 
                    v-if="channel.authorThumbnails && channel.authorThumbnails.length"
                    :src="channel.authorThumbnails[0].url"
                    :alt="channel.author"
                    class="w-8 h-8 rounded-full mr-2"
                    provider="ipx"
                    format="webp"
                    width="32"
                    height="32"
                    loading="lazy"
                  />
                  <div>
                    <p class="font-medium">{{ channel.author }}</p>
                    <p class="text-xs text-gray-500">{{ channel.authorId }}</p>
                  </div>
                </div>
                <button
                  @click="addBannedChannel({...channel, authorThumbnails: channel.authorThumbnails || []})"
                  class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md"
                  :disabled="bannedChannels.some(c => c.id === channel.authorId)"
                >
                  {{ bannedChannels.some(c => c.id === channel.authorId) ? 'Already Banned' : 'Ban Channel' }}
                </button>
              </div>
            </div>
            
            <div class="flex gap-2 mb-4">
              <input
                v-model="newBannedChannelId"
                placeholder="Add channel ID to ban..."
                class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                @keyup.enter="addBannedChannelById"
              />
              <button
                @click="addBannedChannelById"
                class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Ban ID
              </button>
            </div>
            
            <div class="space-y-2">
              <div 
                v-for="(channel, index) in bannedChannels" 
                :key="channel.id" 
                class="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-md"
              >
                <div class="flex items-center">
                  <nuxt-img 
                    v-if="channel.thumbnail"
                    :src="channel.thumbnail"
                    :alt="channel.name"
                    class="w-8 h-8 rounded-full mr-2"
                    provider="ipx"
                    format="webp"
                    width="32"
                    height="32"
                    loading="lazy"
                  />
                  <span class="font-medium">{{ channel.name }}</span>
                </div>
                <button 
                  @click="removeBannedChannel(index)" 
                  class="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"
                >
                  Remove
                </button>
              </div>
              
              <div v-if="!bannedChannels.length" class="text-sm text-gray-500 dark:text-gray-400 italic">
                No channels banned yet
              </div>
            </div>
          </div>
          
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
            <h3 class="text-lg font-medium mb-2">Content Type Filtering</h3>
            
            <div class="flex items-center mb-3">
              <input
                id="shortFormToggle"
                v-model="banShortForm"
                type="checkbox"
                class="w-4 h-4 text-red-600"
              />
              <label for="shortFormToggle" class="ml-2">Ban short form content (videos under 60 seconds)</label>
            </div>
            
            <div class="flex flex-col mb-3">
              <div class="flex items-center">
                <input
                  id="shortFormThreshold"
                  v-model.number="shortFormThreshold"
                  type="range"
                  min="10"
                  max="300"
                  step="5"
                  class="w-full"
                  :disabled="!banShortForm"
                />
              </div>
              <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>10s</span>
                <span>{{ shortFormThreshold }}s</span>
                <span>300s</span>
              </div>
            </div>
          </div>
          
        <div class="flex justify-end mt-6">
          <button
            @click="saveSettings"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { invidiousInstance, invidiousService, defaultInstances } from '~/services/invidious';
import type { SearchResultItem } from '~/types/invidious';

interface Channel {
  id: string;
  name: string;
  thumbnail: string | null;
}

const bannedWords = ref<string[]>([]);
const newBannedWord = ref('');
const levenshteinThreshold = ref(1);

const banShortForm = ref(false);
const shortFormThreshold = ref(60);

const selectedInstance = ref(invidiousInstance.value);
const newInstanceUrl = ref('');
const instances = computed(() => invidiousService.getInstances());

const bannedChannels = ref<Channel[]>([]);
const newBannedChannelId = ref('');

const channelSearchQuery = ref('');
const channelSearchResults = ref<SearchResultItem[]>([]);
const isSearchingChannels = ref(false);

function getHostname(url: string) {
  if (typeof window !== 'undefined') {
    try {
      return new URL(url).hostname;
    } catch (e) {
      console.error('Invalid URL:', url);
    }
  }
  
  const match = url.match(/^(?:https?:\/\/)?([^\/]+)/i);
  return match ? match[1] : url;
}

function changeInstance() {
  invidiousService.setInstance(selectedInstance.value);
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

function removeInstance(url: string) {
  const result = invidiousService.removeCustomInstance(url);
  if (!result.success) {
    alert(result.error);
  }
}

function isDefaultInstance(url: string) {
  return defaultInstances.includes(url);
}

onMounted(() => {
  const savedBannedWords = localStorage.getItem('bannedWords');
  if (savedBannedWords) {
    bannedWords.value = JSON.parse(savedBannedWords);
  }
  
  const savedThreshold = localStorage.getItem('levenshteinThreshold');
  if (savedThreshold) {
    levenshteinThreshold.value = parseInt(savedThreshold);
  }
  
  const savedBanShortForm = localStorage.getItem('banShortForm');
  if (savedBanShortForm) {
    banShortForm.value = savedBanShortForm === 'true';
  }
  
  const savedShortFormThreshold = localStorage.getItem('shortFormThreshold');
  if (savedShortFormThreshold) {
    shortFormThreshold.value = parseInt(savedShortFormThreshold);
  }
  
  const savedBannedChannels = localStorage.getItem('bannedChannels');
  if (savedBannedChannels) {
    try {
      bannedChannels.value = JSON.parse(savedBannedChannels);
    } catch (e) {
      console.error('Failed to parse banned channels:', e);
    }
  }
});

function addBannedWord() {
  if (newBannedWord.value.trim() && !bannedWords.value.includes(newBannedWord.value.trim())) {
    bannedWords.value.push(newBannedWord.value.trim());
    newBannedWord.value = '';
  }
}

function removeBannedWord(index: number) {
  bannedWords.value.splice(index, 1);
}

async function searchChannels() {
  if (!channelSearchQuery.value.trim()) return;
  
  isSearchingChannels.value = true;
  channelSearchResults.value = [];
  
  try {
    const results = await invidiousService.searchVideos(channelSearchQuery.value, { type: 'channel' });
    channelSearchResults.value = results.filter((result: { type: string; }) => result.type === 'channel');
  } catch (error) {
    console.error('Error searching for channels:', error);
  } finally {
    isSearchingChannels.value = false;
  }
}

function addBannedChannel(channel: { authorId: any; author: any; authorThumbnails: string | any[]; }) {
  if (bannedChannels.value.some((c: any) => c.id === channel.authorId)) {
    return;
  }
  
  bannedChannels.value.push({
    id: channel.authorId,
    name: channel.author,
    thumbnail: channel.authorThumbnails && channel.authorThumbnails.length ? channel.authorThumbnails[0].url : null
  });
  
  localStorage.setItem('bannedChannels', JSON.stringify(bannedChannels.value));
}

async function addBannedChannelById() {
  const channelId = newBannedChannelId.value.trim();
  if (!channelId) return;
  
  if (bannedChannels.value.some(c => c.id === channelId)) {
    alert('This channel is already banned.');
    return;
  }
  
  try {
    const channel = await invidiousService.getChannelDetails(channelId);
    if (channel) {
      bannedChannels.value.push({
        id: channelId,
        name: channel.author,
        thumbnail: channel.authorThumbnails && channel.authorThumbnails.length ? 
                  channel.authorThumbnails[0].url : null
      });
      newBannedChannelId.value = '';
      
      localStorage.setItem('bannedChannels', JSON.stringify(bannedChannels.value));
    } else {
      alert('Channel not found. Please check the ID and try again.');
    }
  } catch (error) {
    console.error('Error adding channel by ID:', error);
    alert('Failed to find channel. Please check the ID and try again.');
  }
}

function removeBannedChannel(index: number) {
  bannedChannels.value.splice(index, 1);
  
  localStorage.setItem('bannedChannels', JSON.stringify(bannedChannels.value));
}

function saveSettings() {
  localStorage.setItem('bannedWords', JSON.stringify(bannedWords.value));
  localStorage.setItem('levenshteinThreshold', levenshteinThreshold.value.toString());
  
  localStorage.setItem('banShortForm', banShortForm.value.toString());
  localStorage.setItem('shortFormThreshold', shortFormThreshold.value.toString());
  
  localStorage.setItem('bannedChannels', JSON.stringify(bannedChannels.value));
  
  alert('Settings saved successfully!');
}
</script>