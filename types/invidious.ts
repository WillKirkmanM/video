export interface Channel {
  author: string
  authorId: string
  authorUrl: string
  authorBanners: AuthorBanner[]
  authorThumbnails: AuthorThumbnail[]
  subCount: number
  totalViews: number
  joined: number
  autoGenerated: boolean
  ageGated: boolean
  isFamilyFriendly: boolean
  description: string
  descriptionHtml: string
  allowedRegions: string[]
  tabs: string[]
  tags: string[]
  authorVerified: boolean
  latestVideos: LatestVideo[]
  relatedChannels: any[]
}

export interface AuthorBanner {
  url: string
  width: number
  height: number
}

export interface AuthorThumbnail {
  url: string
  width: number
  height: number
}

export interface LatestVideo {
  type: string
  title: string
  videoId: string
  author: string
  authorId: string
  authorUrl: string
  authorVerified: boolean
  videoThumbnails: VideoThumbnail[]
  description: string
  descriptionHtml: string
  viewCount: number
  viewCountText: string
  published: number
  publishedText: string
  lengthSeconds: number
  liveNow: boolean
  premium: boolean
  isUpcoming: boolean
  isNew: boolean
  is4k: boolean
  is8k: boolean
  isVr180: boolean
  isVr360: boolean
  is3d: boolean
  hasCaptions: boolean
}

export interface VideoThumbnail {
  quality: string
  url: string
  width: number
  height: number
}

