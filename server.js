// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.YOUTUBE_API_KEY || '';

// ---------- FRONTEND: HTML DIRECTLY ON "/" ----------

app.get('/', (req, res) => {
  res.send('<!DOCTYPE html>' +
    '<html lang="en">' +
    '<head>' +
    '  <meta charset="UTF-8" />' +
    '  <title>YouTube Channel URL Extractor</title>' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />' +
    '  <style>' +
    '    body {' +
    '      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;' +
    '      background-color: #f4f4f4;' +
    '      margin: 0;' +
    '      padding: 0;' +
    '    }' +
    '    .container {' +
    '      max-width: 900px;' +
    '      margin: 40px auto;' +
    '      background: #ffffff;' +
    '      padding: 24px 28px 32px;' +
    '      border-radius: 12px;' +
    '      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);' +
    '    }' +
    '    h1 {' +
    '      font-size: 28px;' +
    '      margin-top: 0;' +
    '      margin-bottom: 8px;' +
    '    }' +
    '    p.description {' +
    '      color: #555;' +
    '      margin-top: 0;' +
    '      margin-bottom: 24px;' +
    '      font-size: 14px;' +
    '      line-height: 1.5;' +
    '    }' +
    '    label {' +
    '      display: block;' +
    '      font-weight: 500;' +
    '      margin-bottom: 8px;' +
    '      font-size: 14px;' +
    '    }' +
    '    input[type="text"] {' +
    '      width: 100%;' +
    '      padding: 10px 12px;' +
    '      border-radius: 8px;' +
    '      border: 1px solid #ccc;' +
    '      font-size: 14px;' +
    '      box-sizing: border-box;' +
    '    }' +
    '    .filter-group {' +
    '      margin: 16px 0 24px;' +
    '      font-size: 14px;' +
    '    }' +
    '    .filter-group span.heading {' +
    '      font-weight: 500;' +
    '      margin-right: 8px;' +
    '    }' +
    '    .filter-group label {' +
    '      display: inline-flex;' +
    '      align-items: center;' +
    '      margin-right: 16px;' +
    '      font-weight: 400;' +
    '    }' +
    '    .filter-group input[type="radio"] {' +
    '      margin-right: 6px;' +
    '    }' +
    '    button {' +
    '      padding: 8px 14px;' +
    '      border-radius: 999px;' +
    '      border: none;' +
    '      cursor: pointer;' +
    '      font-weight: 600;' +
    '      font-size: 13px;' +
    '      background: #000000;' +
    '      color: #ffffff;' +
    '    }' +
    '    button:disabled {' +
    '      opacity: 0.6;' +
    '      cursor: default;' +
    '    }' +
    '    .status {' +
    '      margin-top: 16px;' +
    '      font-size: 14px;' +
    '      color: #444;' +
    '    }' +
    '    .status.error {' +
    '      color: #b00020;' +
    '    }' +
    '    ol {' +
    '      margin-top: 24px;' +
    '      padding-left: 24px;' +
    '      font-size: 14px;' +
    '    }' +
    '    li {' +
    '      margin-bottom: 10px;' +
    '    }' +
    '    .video-title {' +
    '      display: block;' +
    '      font-weight: 500;' +
    '      margin-bottom: 2px;' +
    '    }' +
    '    .video-url {' +
    '      font-family: monospace;' +
    '      font-size: 13px;' +
    '      color: #0066cc;' +
    '      text-decoration: none;' +
    '      word-break: break-all;' +
    '      margin-right: 8px;' +
    '    }' +
    '    .video-url:hover {' +
    '      text-decoration: underline;' +
    '    }' +
    '    .duration {' +
    '      font-size: 12px;' +
    '      color: #777;' +
    '      margin-left: 6px;' +
    '    }' +
    '    .copy-btn {' +
    '      margin-left: 4px;' +
    '      padding: 4px 10px;' +
    '      font-size: 12px;' +
    '    }' +
    '  </style>' +
    '</head>' +
    '<body>' +
    '  <div class="container">' +
    '    <h1>YouTube Channel URL Extractor</h1>' +
    '    <p class="description">' +
    '      Paste a YouTube channel link, choose whether you want Shorts, long videos,' +
    '      or everything, and get a numbered list of video URLs with copy buttons.' +
    '    </p>' +
    '    <form id="channelForm">' +
    '      <label for="channelUrl">YouTube channel link</label>' +
    '      <input type="text" id="channelUrl" placeholder="https://www.youtube.com/@channelHandle or https://www.youtube.com/channel/UC..." required />' +
    '      <div class="filter-group">' +
    '        <span class="heading">Include:</span>' +
    '        <label><input type="radio" name="type" value="all" checked />All videos</label>' +
    '        <label><input type="radio" name="type" value="long" />Only long videos (≥ 60s)</label>' +
    '        <label><input type="radio" name="type" value="shorts" />Only Shorts (&lt; 60s)</label>' +
    '      </div>' +
    '      <button type="submit" id="submitBtn">Get video URLs</button>' +
    '    </form>' +
    '    <div id="status" class="status"></div>' +
    '    <ol id="results"></ol>' +
    '  </div>' +
    '  <script>' +
    '    const form = document.getElementById("channelForm");' +
    '    const statusEl = document.getElementById("status");' +
    '    const resultsEl = document.getElementById("results");' +
    '    const submitBtn = document.getElementById("submitBtn");' +
    '    function formatDuration(seconds) {' +
    '      if (!seconds || seconds <= 0 || !Number.isFinite(seconds)) return "";' +
    '      const mins = Math.floor(seconds / 60);' +
    '      const secs = seconds % 60;' +
    '      if (mins === 0) return seconds + "s";' +
    '      return mins + "m " + secs.toString().padStart(2, "0") + "s";' +
    '    }' +
    '    form.addEventListener("submit", async (event) => {' +
    '      event.preventDefault();' +
    '      const channelUrl = document.getElementById("channelUrl").value.trim();' +
    '      const typeInput = document.querySelector("input[name=\\"type\\"]:checked");' +
    '      const type = typeInput ? typeInput.value : "all";' +
    '      if (!channelUrl) return;' +
    '      statusEl.textContent = "Fetching videos...";' +
    '      statusEl.classList.remove("error");' +
    '      resultsEl.innerHTML = "";' +
    '      submitBtn.disabled = true;' +
    '      try {' +
    '        const params = new URLSearchParams({ channelUrl: channelUrl, type: type });' +
    '        const response = await fetch("/api/videos?" + params.toString());' +
    '        const data = await response.json();' +
    '        if (!response.ok) {' +
    '          throw new Error(data.error || "Request failed.");' +
    '        }' +
    '        const videos = data.videos || [];' +
    '        if (videos.length === 0) {' +
    '          statusEl.textContent = "No videos found for this channel and filter."; return;' +
    '        }' +
    '        statusEl.textContent = "Found " + videos.length + " videos.";' +
    '        resultsEl.innerHTML = "";' +
    '        videos.forEach((video) => {' +
    '          const li = document.createElement("li");' +
    '          const titleSpan = document.createElement("span");' +
    '          titleSpan.className = "video-title";' +
    '          titleSpan.textContent = video.title || "(no title)";' +
    '          const link = document.createElement("a");' +
    '          link.className = "video-url";' +
    '          link.href = video.url;' +
    '          link.target = "_blank";' +
    '          link.rel = "noopener noreferrer";' +
    '          link.textContent = video.url;' +
    '          const copyBtn = document.createElement("button");' +
    '          copyBtn.type = "button";' +
    '          copyBtn.className = "copy-btn";' +
    '          copyBtn.textContent = "Copy";' +
    '          copyBtn.setAttribute("data-url", video.url);' +
    '          const durationSpan = document.createElement("span");' +
    '          durationSpan.className = "duration";' +
    '          const formatted = formatDuration(Number(video.durationSeconds));' +
    '          durationSpan.textContent = formatted ? "Duration: " + formatted : "";' +
    '          li.appendChild(titleSpan);' +
    '          li.appendChild(link);' +
    '          li.appendChild(copyBtn);' +
    '          if (formatted) {' +
    '            li.appendChild(durationSpan);' +
    '          }' +
    '          resultsEl.appendChild(li);' +
    '        });' +
    '      } catch (error) {' +
    '        console.error(error);' +
    '        statusEl.textContent = error.message || "Error fetching videos.";' +
    '        statusEl.classList.add("error");' +
    '      } finally {' +
    '        submitBtn.disabled = false;' +
    '      }' +
    '    });' +
    '    document.addEventListener("click", async (event) => {' +
    '      const target = event.target;' +
    '      if (target && target.classList.contains("copy-btn")) {' +
    '        const url = target.getAttribute("data-url");' +
    '        if (!url) return;' +
    '        try {' +
    '          await navigator.clipboard.writeText(url);' +
    '          const original = target.textContent;' +
    '          target.textContent = "Copied!";' +
    '          setTimeout(() => { target.textContent = original; }, 1200);' +
    '        } catch (err) {' +
    '          console.error(err);' +
    '        }' +
    '      }' +
    '    });' +
    '  </script>' +
    '</body>' +
    '</html>');
});

async function getChannelInfo(identifier) {
  const url = 'https://www.googleapis.com/youtube/v3/channels';
  const params = { part: 'id,contentDetails', key: API_KEY };

  if (identifier.type === 'channelId') params.id = identifier.value;
  else if (identifier.type === 'handle') params.forHandle = identifier.value;
  else if (identifier.type === 'username') params.forUsername = identifier.value;

  const response = await axios.get(url, { params: params });
  const items = response.data.items || [];
  if (items.length === 0) throw new Error('Channel not found for this URL.');

  const channel = items[0];
  const uploadsPlaylistId = channel.contentDetails &&
    channel.contentDetails.relatedPlaylists &&
    channel.contentDetails.relatedPlaylists.uploads;

  if (!uploadsPlaylistId) throw new Error('Could not find uploads playlist for this channel.');

  return { channelId: channel.id, uploadsPlaylistId: uploadsPlaylistId };
}

async function getAllVideoIdsFromPlaylist(playlistId) {
  const url = 'https://www.googleapis.com/youtube/v3/playlistItems';
  const videoIds = [];
  let pageToken = undefined;

  do {
    const response = await axios.get(url, {
      params: {
        part: 'contentDetails',
        playlistId: playlistId,
        maxResults: 50,
        pageToken: pageToken,
        key: API_KEY
      }
    });
    const data = response.data;
    const items = data.items || [];
    for (const item of items) {
      const videoId = item.contentDetails && item.contentDetails.videoId;
      if (videoId) videoIds.push(videoId);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return videoIds;
}

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

async function getVideoDetails(videoIds) {
  const url = 'https://www.googleapis.com/youtube/v3/videos';
  const result = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const response = await axios.get(url, {
      params: { part: 'contentDetails,snippet', id: batch.join(','), key: API_KEY }
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

app.get('/api/videos', async (req, res) => {
  try {
    const channelUrl = req.query.channelUrl;
    const type = req.query.type || 'all';

    if (!channelUrl) return res.status(400).json({ error: 'channelUrl query parameter is required.' });
    if (!API_KEY) return res.status(500).json({ error: 'YOUTUBE_API_KEY is not configured on the server.' });

    const identifier = parseChannelIdentifier(channelUrl);
    const info = await getChannelInfo(identifier);
    const videoIds = await getAllVideoIdsFromPlaylist(info.uploadsPlaylistId);
    if (videoIds.length === 0) return res.json({ videos: [] });

    const details = await getVideoDetails(videoIds);

    const filtered = details.filter((video) => {
      const secs = video.durationSeconds || 0;
      if (type === 'shorts') return secs > 0 && secs < 60;
      if (type === 'long') return secs >= 60;
      return true;
    });

    const videos = filtered.map((v) => ({
      id: v.id,
      title: v.title,
      durationSeconds: v.durationSeconds,
      url: 'https://www.youtube.com/watch?v=' + v.id
    }));

    res.json({ videos: videos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Something went wrong.' });
  }
});

app.listen(PORT, () => {
  console.log('Server is running on port ' + PORT);
});
