import {request} from './http.js';
const link = document.getElementById('download');
const status = document.getElementById('release-status');
try {
  const release = await (await request('update.json', {cache: 'no-store'})).json();
  if (typeof release.version !== 'string'
      || !/^v?\d+\.\d+(?:\.\d+)?(?:-beta(?:\.\d+)?)?$/.test(release.version)
      || typeof release.download_url !== 'string') throw new Error('Invalid release feed');
  const download = new URL(release.download_url);
  if (download.protocol !== 'https:' || download.username || download.password)
    throw new Error('Invalid download link');
  link.href = download.href; link.textContent = 'Download for Windows ↗';
  status.textContent = `v${release.version.replace(/^v/, '')} · Windows x64 · Free`;
} catch (_) {
  status.textContent = 'Release details unavailable. Visit GitHub Releases for downloads.';
}
