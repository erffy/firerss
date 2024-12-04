import { InitDefaultSettings } from './lib/init_default_settings';

export const findAllFeeds = async (): Promise<string[]> => {
  const settings = (await browser.storage.local.get('firerss_settings')).firerss_settings ?? await InitDefaultSettings();
  const feed_urls = new Set<string>();
  const youtube_user_pattern = /(?<=(https:\/\/(www\.)?youtube.com\/))@\w+/gi;

  let doc: Document;
  if (window.location.origin.includes('youtube.com') && window.location.href.match(youtube_user_pattern)) doc = new DOMParser().parseFromString(document.documentElement.outerHTML, 'text/html');
  else doc = document;

  const collected_feeds = doc.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"], a[href*="rss"], a[href*="atom"], a[href*="feed"]');
  for (let index = 0, feed = collected_feeds[index]; index < collected_feeds.length; index++) {
    if (feed instanceof HTMLLinkElement) {
      if (feed.href.includes('youtube.com') && !feed.baseURI.match(youtube_user_pattern)) return [];
      feed_urls.add(feed.href);
    }
  }

  if (settings.extended_feed_scan === 0) return Array.from(feed_urls);
  else if (settings.extended_feed_scan === 1) {
    if (feed_urls.size > 0) return Array.from(feed_urls);
  }

  const possible_feed_files = [
    '.atom',
    '.feed',
    '.rss',
    '.xml',
    '/atom.xml',
    '/atom',
    '/feed.xml',
    '/feed',
    '/index.xml',
    '/rss.xml',
    '/rss',
  ];

  for (const file of possible_feed_files) {
    let feed;
    if (window.location.pathname === '/') {
      if (file.startsWith('.')) continue;
      feed = window.location.href + file.slice(1);
    } else {
      if (file.startsWith('.')) feed = window.location.href + file;
      else feed = window.location.origin + file;
    }

    const response = await fetch(feed);
    if (response.ok && response.headers.get('Content-Type')?.includes('xml') && !feed_urls.has(feed)) {
      feed_urls.add('_' + feed);
    }
  }

  return Array.from(feed_urls);
};