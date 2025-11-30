// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.YOUTUBE_API_KEY;

if (!API_KEY) {
  console.warn('Warning: YOUTUBE_API_KEY is not set in the environment.');
}

// Serve static files (our frontend) from /public
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Parse a YouTube channel URL and figure out what kind it is:
 *  - /channel/UC...   => channelId
 *  - /user/SomeName   => username
 *  - /@handle/videos  => handle
 */
function parseChannelIdentifier(url) {
  try {
    const u = new URL(url);
    const segments = u.pathname.split('/').filter(Boolean); // remove empty strings

    // /channel/UCxxxxxxxx
    if (segments[0] === 'channel' && segments[1]) {
      return { type: 'channelId', value: segments[1] };
    }

    // /user/SomeUserName
    if (segments[0] === 'user' && segments[1]) {
      return { type: 'username', value: segments[1] };
    }

    // /@handle or /@handle/videos
    const handleSegment = segments.find(seg => seg.startsWith('@'));
    if (handleSegment) {
      return { type: 'handle', value: handleSegment };
    }

    throw new Error('Could not parse channel from URL.');
  } catch (err) {
    throw new Error('Invalid channel URL.');
  }
}

/**
 * Use channels.list to get the channel ID + uploads playlist from:
 *  - channelId
 *  - handle (@something)
 *  - username
 */
async function getChannelInfo(identifier) {
  const url = 'https://www.googleapis.com/youtube/v3/channels';

  const params = {
    part: 'id,contentDetails',
    key: API_KEY
  };

  if (identifier.type === 'channelId') {
    params.id = identifier.value;
  } else if (identifier.type === 'handle') {
    params.forHandle = identifier.value; // YouTube handle like @markbuildsbrands
  } else if (identifier.type === 'username') {
    params.forUsername = identifier.value;
  }

  const response = await axios.get(url, { params });
  const items = response.data.items || [];

  if (items.length === 0) {
    throw new Error('Channel not found for this URL.');
  }

  const channel = items[0];
  const uploadsPlaylistId =
    channel.contentDetails &&
    channel.contentDetails.relatedPlaylists &&
    channel.contentDetails.relatedPlaylists.uploads;

  if (!uploadsPlaylistId) {
    throw new Error('Could not find uploads playlist for this channel.');
  }

  return {
    channelId: channel.id,
    uploadsPlaylistId
  };
}

/**
 * Get ALL video IDs from the channel's uploads playlist, paging through results.
 */
async function getAllVideoIdsFromPlaylist(playlistId) {
  const url = 'https://www.googleapis.com/youtube/v3/playlistItems';
  const videoIds = [];
  let pageToken = undefined;

  do {
    const response = await axios.get(url, {
      params: {
        part: 'contentDetails',
        playlistId,
        maxResults: 50,
        pageToken,
        key: API_KEY
      }
    });

    const data = response.data;
    const items = data.items || [];

    for (const item of items) {
      const videoId = item.contentDetails && item.contentDetails.videoId;
      if (videoId) {
        videoIds.push(videoId);
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return videoIds;
}

/**
 * Convert ISO 8601 duration (e.g. PT1M30S, PT2H, PT45S) to total seconds.
 */
function isoDurationToSeconds(iso) {
  if (!iso || typeof iso !== 'string') return 0;
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = iso.match(regex);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Given a list of video IDs, fetch duration + title for all of them.
 */
async function getVideoDetails(videoIds) {
  const url = 'https://www.googleapis.com/youtube/v3/videos';
  const result = [];

  // videos.list takes up to 50 IDs at a time
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);

    const response = await axios.get(url, {
      params: {
        part: 'contentDetails,snippet',
        id: batch.join(','),
        key: API_KEY
      }
    });

    const items = response.data.items || [];

    for (const item of items) {
      const durationIso = item.contentDetails && item.contentDetails.duration;
      const seconds = isoDurationToSeconds(durationIso);

      result.push({
        id: item.id,
        title: (item.snippet && item.snippet.title) || '',
        durationSeconds: seconds
      });
    }
  }

  return result;
}

/**
 * API route: /api/videos
 * Query params:
 *  - channelUrl (required)
 *  - type = all | shorts | long
 */
app.get('/api/videos', async (req, res) => {
  try {
    const channelUrl = req.query.channelUrl;
    const type = req.query.type || 'all';

    if (!channelUrl) {
      return res.status(400).json({ error: 'channelUrl query parameter is required.' });
    }

    if (!API_KEY) {
      return res.status(500).json({ error: 'YOUTUBE_API_KEY is not configured on the server.' });
    }

    const identifier = parseChannelIdentifier(channelUrl);
    const { uploadsPlaylistId } = await getChannelInfo(identifier);
    const videoIds = await getAllVideoIdsFromPlaylist(uploadsPlaylistId);

    if (videoIds.length === 0) {
      return res.json({ videos: [] });
    }

    const details = await getVideoDetails(videoIds);

    // Filter based on type
    const filtered = details.filter(video => {
      const secs = video.durationSeconds || 0;
      if (type === 'shorts') {
        // Under 60 seconds
        return secs > 0 && secs < 60;
      }
      if (type === 'long') {
        // 60 seconds or longer
        return secs >= 60;
      }
      // 'all'
      return true;
    });

    const videos = filtered.map(v => ({
      id: v.id,
      title: v.title,
      durationSeconds: v.durationSeconds,
      url: `https://www.youtube.com/watch?v=${v.id}`
    }));

    res.json({ videos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Something went wrong.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
