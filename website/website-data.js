export function validateAuthConfig(config) {
  if (!config || typeof config.supabase?.url !== 'string'
      || !/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(config.supabase.url)
      || typeof config.supabase.publishableKey !== 'string'
      || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.supabase.publishableKey)
      || config.supabase.publishableKey.includes('REPLACE')
      || typeof config.apiBase !== 'string'
      || config.apiBase.replace(/\/$/, '') !== config.supabase.url + '/functions/v1/access') {
    throw new Error('Supabase configuration is not ready.');
  }
  return config;
}

export function releaseDownload(release) {
  if (!release || typeof release.version !== 'string'
      || !/^v?\d+\.\d+(?:\.\d+)?(?:-beta(?:\.\d+)?)?$/.test(release.version)
      || typeof release.download_url !== 'string'
      || (release.notes !== undefined && typeof release.notes !== 'string')) {
    throw new Error('Invalid release feed');
  }
  const download = new URL(release.download_url);
  // The desktop updater consumes this exact string without browser URL repair.
  if (download.protocol !== 'https:' || download.username || download.password
      || download.href !== release.download_url) {
    throw new Error('Invalid download link');
  }
  return download;
}
