import { ref } from "vue";
import { invidiousService } from "./invidious";

export interface SubscribedChannel {
  id: string;
  name: string;
  thumbnail: string;
  subscribedAt: number;
}

export const subscriptions = ref<SubscribedChannel[]>([]);

if (typeof localStorage !== "undefined") {
  const savedSubscriptions = localStorage.getItem("subscriptions");
  if (savedSubscriptions) {
    try {
      subscriptions.value = JSON.parse(savedSubscriptions);
    } catch (e) {
      console.error("Failed to parse subscriptions:", e);
    }
  }
}

export const subscriptionService = {
  /**
   * Add a channel to subscriptions
   */
  subscribe(channel: {
    authorId: string;
    author: string;
    authorThumbnails?: any[];
  }): boolean {
    if (this.isSubscribed(channel.authorId)) {
      return false;
    }

    const thumbnailUrl =
      channel.authorThumbnails && channel.authorThumbnails.length
        ? channel.authorThumbnails[0].url
        : null;

    subscriptions.value.push({
      id: channel.authorId,
      name: channel.author,
      thumbnail: thumbnailUrl,
      subscribedAt: Date.now(),
    });

    this._saveSubscriptions();
    return true;
  },

  /**
   * Remove a channel from subscriptions
   */
  unsubscribe(channelId: string): boolean {
    const initialLength = subscriptions.value.length;
    subscriptions.value = subscriptions.value.filter(
      (sub) => sub.id !== channelId
    );

    if (subscriptions.value.length !== initialLength) {
      this._saveSubscriptions();
      return true;
    }
    return false;
  },

  /**
   * Check if user is subscribed to channel
   */
  isSubscribed(channelId: string): boolean {
    return subscriptions.value.some((sub) => sub.id === channelId);
  },

  /**
   * Get all subscriptions
   */
  getSubscriptions(): SubscribedChannel[] {
    return subscriptions.value;
  },

  /**
   * Fetch latest videos from all subscribed channels with balanced distribution
   */
  async getSubscriptionFeed(limit: number = 30): Promise<any[]> {
    if (subscriptions.value.length === 0) {
      return [];
    }

    try {
      const channelVideosPromises = subscriptions.value.map((sub) =>
        invidiousService.getChannelVideos(sub.id)
      );

      const results = await Promise.allSettled(channelVideosPromises);

      const videosPerChannel: { [key: string]: any[] } = {};
      const maxVideosPerChannel = Math.max(
        3,
        Math.floor(limit / subscriptions.value.length)
      );

      results.forEach((result, index) => {
        if (
          result.status === "fulfilled" &&
          result.value &&
          result.value.videos
        ) {
          const channelId = subscriptions.value[index].id;
          const channelName = subscriptions.value[index].name;

          const videos = result.value.videos
            .slice(0, maxVideosPerChannel)
            .map((video) => ({
              ...video,
              channelId,
              channelName,
            }));

          videosPerChannel[channelId] = videos;
        }
      });

      let allVideos: any[] = [];

      let hasMoreVideos = true;
      let currentIndex = 0;

      while (hasMoreVideos && allVideos.length < limit) {
        hasMoreVideos = false;

        for (const channelId of Object.keys(videosPerChannel)) {
          const channelVideos = videosPerChannel[channelId];

          if (currentIndex < channelVideos.length) {
            allVideos.push(channelVideos[currentIndex]);
            hasMoreVideos = true;

            if (allVideos.length >= limit) break;
          }
        }

        currentIndex++;
      }

      for (let i = allVideos.length - 1; i > 0; i--) {
        const randomOffset = Math.floor(Math.random() * 3);
        const j = Math.max(0, i - randomOffset);

        if (i !== j) {
          [allVideos[i], allVideos[j]] = [allVideos[j], allVideos[i]];
        }
      }

      return allVideos;
    } catch (error) {
      console.error("Error fetching subscription feed:", error);
      return [];
    }
  },

  /**
   * Save subscriptions to localStorage
   */
  _saveSubscriptions() {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        "subscriptions",
        JSON.stringify(subscriptions.value)
      );
    }
  },
};
