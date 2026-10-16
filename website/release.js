import {request} from './http.js';
import {releaseDownload} from './website-data.js';
const link = document.getElementById('download');
const status = document.getElementById('release-status');
try {
  const release = await (await request('update.json', {cache: 'no-store'})).json();
  const download = releaseDownload(release);
  link.href = download.href; link.textContent = 'Download for Windows ↗';
  status.textContent = `v${release.version.replace(/^v/, '')} · Windows x64 · Free`;
} catch (_) {
  status.textContent = 'Release details unavailable. Visit GitHub Releases for downloads.';
}
