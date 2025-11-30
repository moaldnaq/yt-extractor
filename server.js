// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.YOUTUBE_API_KEY;

if (!API_KEY) {
  console.warn('Warning: YOUTUBE_API_KEY is not set in the environment.');
}

// --------- FRONTEND: SERVE HTML DIRECTLY FROM "/" ---------
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>YouTube Channel URL Extractor</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }

    .container {
      max-width: 900px;
      margin: 40px auto;
      background: #ffffff;
      padding: 24px 28px 32px;
      border-radius: 12px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
    }

    h1 {
      font-size: 28px;
      margin-top: 0;
      margin-bottom: 8px;
    }

    p.description {
      color: #555;
      margin-top: 0;
      margin-bottom: 24px;
      font-size: 14px;
      line-height: 1.5;
    }

    label {
      display: block;
      font-weight: 500;
      margin-bottom: 8px;
      font-size: 14px;
    }

    input[type="text"] {
      width: 100%;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #ccc;
      font-size: 14px;
      box-sizing: border-box;
    }

    .filter-group {
      margin: 16px 0 24px;
      font-size: 14px;
    }

    .filter-group span.heading {
      font-weight: 500;
      margin-right: 8px;
    }

    .filter-group label {
      display: inline-flex;
      align-items: center;
      margin-right: 16px;
      font-weight: 400;
    }

    .filter-group input[type="radio"] {
      margin-right: 6px;
    }

    button {
      padding: 10px 20px;
      border-radius: 999px;
      border: none;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      background: #000000;
      color: #ffffff;
    }

    button:disabled {
      opacity: 0.6;
      cursor: default;
    }

    .status {
      margin-top: 16px;
      font-size: 14px;
      color: #444;
    }

    .status.error {
      color: #b00020;
    }

    ol {
      margin-top: 24px;
      padding-left: 24px;
      font-size: 14px;
    }

    li {
      margin-bottom: 8px;
    }

    .video-title {
      display: block;
      font-weight: 500;
      margin-bottom: 2px;
    }

    .video-url {
      font-family: monospace;
      font-size: 13px;
      color: #0066cc;
      text-decoration: none;
      word-break: break-all;
    }

    .video-url:hover {
      text-decoration: underline;
    }

    .duration {
      font-size: 12px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>YouTube Channel URL Extractor</h1>
    <p class="description">
      Paste a YouTube channel link, choose whether you want Shorts, long videos,
      or everything, and get a numbered list of video URLs.
    </p>

    <form id="channelForm">
      <label for="channelUrl">YouTube channel link</label>
      <input
        type="text"
        id="channelUrl"
        placeholder="https://www.youtube.com/@channelHandle or https://www.youtube.com/channel/UC..."
        required
      />

      <div class="filter-group">
        <span class="heading">Include:</span>
        <label>
          <input type="radio" name="type" value="all" checked />
          All videos
        </label>
        <label>
          <input type="radio" name="type" value="long" />
          Only long videos (≥ 60s)
        </label>
        <label>
          <input type="radio" name="type" value="shorts" />
          Only Shorts (&lt; 60s)
        </label>
      </div>

      <button type="submit" id="submitBtn">Get video URLs</button>
    </form>

    <div id="status" class="status"></div>
    <ol id="results"></ol>
  </div>

  <script>
    const form = document.getElementById('channelForm');
    const statusEl = document.getElementById('status');
    const resultsEl = document.getElementById('results');
    const submitBtn = document.getElementById('submitBtn');

    function formatDuration(seconds) {
      if (!seconds || seconds <= 0 || !Number.isFinite(seconds)) return '';
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      if (mins === 0) return seconds + 's';
      return mins + 'm ' + secs.toString().padStart(2, '0') + 's';
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const channelUrl = document.getElementById('channelUrl').value.trim();
      const type = document.querySelector('input[name="type"]:checked').value;

      if (!channelUrl) return;

      statusEl.textContent = 'Fetching videos...';
      statusEl.classList.remove('error');
      resultsEl.innerHTML = '';
      submitBtn.disabled = true;

      try {
        const params = new URLSearchParams({ channelUrl, type });
        const response = await fetch('/api/videos?' + params.toString());
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Request failed.');
        }

        const videos = data.videos || [];

        if (videos.length === 0) {
          statusEl.textContent = 'No videos found for this channel and filter.';
          return;
        }

        statusEl.textContent = \`Found \${videos.length} videos.\`;
        resultsEl.innerHTML = '';

        videos.forEach((video) => {
          const li = document.createElement('li');

          const titleSpan = document.createElement('span');
          titleSpan.className = 'video-title';
          titleSpan.textContent = video.title || '(no title)';

          const link = document.createElement('a');
          link.className = 'video-url';
          link.href = video.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = video.url;

          const durationSpan = document.createElement('span');
          durationSpan.className = 'duration';
          const formatted = formatDuration(Number(vi
