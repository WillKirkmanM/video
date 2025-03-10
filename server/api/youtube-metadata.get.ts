import { defineEventHandler, getQuery } from 'h3'
import type { H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
  const query = getQuery(event)
  const videoId = query.videoId as string

  if (!videoId) {
    return { error: 'Video ID is required' }
  }

  try {
    const oEmbedResponse = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    )
    
    if (!oEmbedResponse.ok) {
      throw new Error('Failed to fetch from oEmbed API')
    }
    
    const oEmbedData = await oEmbedResponse.json()

    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    })

    if (pageResponse.ok) {
      const html = await pageResponse.text()
      
      const viewCount = html.match(/"viewCount":"(\d+)"/)?.at(1) || 'N/A'
      const likeCount = html.match(/"likeCount":"(\d+)"/)?.at(1) || 'N/A'
      const publishDate = html.match(/"publishDate":"([^"]+)"/)?.at(1)
      const description = html.match(/"description":{"simpleText":"([^"]+)"/)?.at(1)?.replace(/\\n/g, '\n') || 
                         html.match(/"description":{"runs":\[(.*?)\]}/)?.at(1) || ''
      
      const profilePicRegex = /https:\/\/yt3\.ggpht\.com\/[a-zA-Z0-9_\-\/]+=[a-zA-Z0-9\-]+/g
      const profilePicMatches = html.match(profilePicRegex)
      const profilePicUrl = profilePicMatches && profilePicMatches.length > 0 
        ? profilePicMatches[0] 
        : null
      
      let subCount = 'N/A'
      const subCountRegex = /"subscriberCountText":\{"simpleText":"([^"]+)"\}/
      const subCountMatch = html.match(subCountRegex)
      if (subCountMatch && subCountMatch[1]) {
        subCount = subCountMatch[1]
      } else {
        const altSubCountMatch = html.match(/"ownerSubCount":{"simpleText":"([^"]+)"/)
        if (altSubCountMatch && altSubCountMatch[1]) {
          subCount = altSubCountMatch[1]
        }
      }
      
      let extractedLikes = likeCount
      const likesPatterns = [
        /"topLevelButtons":\[{"buttonRenderer":{"accessibilityText":"([^"]*? likes)/,
        /"topLevelButtons":\[.*?"accessibilityData":{"label":"([^"]*? likes)/,
        /"likeCount":"(\d+)"/
      ]
      
      for (const pattern of likesPatterns) {
        const match = html.match(pattern)
        if (match && match[1]) {
          const numericPart = match[1].match(/(\d[\d,.]*)/)
          if (numericPart && numericPart[1]) {
            extractedLikes = numericPart[1].replace(/,/g, '')
            break
          }
        }
      }
      
      const formattedLikes = extractedLikes !== 'N/A' ? 
        (isNaN(Number(extractedLikes)) ? extractedLikes : formatCount(parseInt(extractedLikes))) : 
        'N/A'

      let publishedText = 'N/A'
      if (publishDate) {
        const date = new Date(publishDate)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
        
        if (diffDays < 1) publishedText = 'Today'
        else if (diffDays < 2) publishedText = 'Yesterday'
        else if (diffDays < 7) publishedText = `${diffDays} days ago`
        else if (diffDays < 30) publishedText = `${Math.floor(diffDays / 7)} weeks ago`
        else if (diffDays < 365) publishedText = `${Math.floor(diffDays / 30)} months ago`
        else publishedText = `${Math.floor(diffDays / 365)} years ago`
      }

      return {
        videoId,
        title: oEmbedData.title,
        author: oEmbedData.author_name,
        authorId: oEmbedData.author_url?.split('/').pop() || '',
        authorThumbnails: profilePicUrl ? [{ 
          url: profilePicUrl,
          width: 88,
          height: 88
        }] : [],
        publishedText,
        viewCount: formatCount(parseInt(viewCount)),
        likeCount: formattedLikes,
        dislikeCount: 'N/A',
        subCountText: subCount,
        description: description || 'No description available'
      }
    }

    return {
      videoId,
      title: oEmbedData.title,
      author: oEmbedData.author_name,
      authorId: oEmbedData.author_url?.split('/').pop() || '',
      authorThumbnails: [],
      publishedText: 'N/A',
      viewCount: 'N/A',
      likeCount: 'N/A',
      dislikeCount: 'N/A',
      subCountText: 'N/A',
      description: 'Description not available'
    }

  } catch (err) {
    console.error('Error fetching YouTube metadata:', err)
    return { error: 'Failed to fetch metadata' }
  }
})

function formatCount(num: number): string {
  if (isNaN(num)) return 'N/A'
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return num.toString()
}