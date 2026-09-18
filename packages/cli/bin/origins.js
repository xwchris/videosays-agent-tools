export const DEFAULT_API_URL = 'https://api.videosays.cn';

export function getApiUrl(value = process.env.VIDEOSAYS_API_URL) {
  return (value?.trim() || DEFAULT_API_URL).replace(/\/$/, '');
}

export function getWebsiteUrl(apiUrl) {
  return apiUrl === 'https://api.videosays.com' ? 'https://videosays.com' : 'https://videosays.cn';
}

// Older API versions return .com browser links even for requests to the .cn API.
// Only map official login/billing pages; preserve custom deployments and other URLs.
export function resolveWebsiteLink(value, apiUrl) {
  if (!['https://api.videosays.cn', 'https://api.videosays.com'].includes(apiUrl)) return value;
  try {
    const url = new URL(value);
    if (url.username || url.password
      || !['https://videosays.com', 'https://videosays.cn'].includes(url.origin)
      || !['/cli/auth', '/dashboard/billing'].includes(url.pathname)) return value;
    url.hostname = new URL(getWebsiteUrl(apiUrl)).hostname;
    return url.toString();
  } catch {
    return value;
  }
}
