import { findAllFeeds } from './content';
import { InitDefaultSettings } from './lib/init_default_settings';

enum Status {
  LOADING = 'Loading',
  NO_FEEDS = 'No feeds found',
  SITE_IGNORED = 'Site ignored',
  BROWSER_PAGE = 'Browser page',
}

const popup_url = browser.runtime.getURL('/html/popup.html');
const ACTION = browser.action;

const sanitizeUrl = (url: string) => url.replace(/\W/gi, '');

const updateBadge = (tabId?: number, status?: Status, feedCount?: number) => {
  const isTabSpecified = tabId !== undefined;
  const tabContext = isTabSpecified ? { tabId } : {};

  ACTION.disable(tabId);
  ACTION.setIcon({ ...tabContext, path: '/img/firerss_32_gray.png' });

  let badgeText = '', badgeColor = '#FF6600';
  switch (status) {
    case Status.LOADING:
      badgeText = '...';
      break;
    case Status.NO_FEEDS:
      badgeText = '0';
      break;
    case Status.SITE_IGNORED:
      badgeText = 'X';
      badgeColor = '#FFFF00';
      break;
    case Status.BROWSER_PAGE:
      badgeText = 'B';
      badgeColor = '#FFFF00';
      break;
  }

  ACTION.setBadgeText({ ...tabContext, text: badgeText });
  ACTION.setBadgeBackgroundColor({ ...tabContext, color: badgeColor });
  ACTION.setTitle({
    ...tabContext,
    title: `FireRSS${status ? ` (${status})` : ''}`
  });
};

const updatePopupState = (tabId: number, feedUrls: string[]) => {
  if (feedUrls.length === 0) {
    updateBadge(tabId);
    return;
  }

  ACTION.enable(tabId);
  ACTION.setIcon({ tabId, path: '/img/firerss_32.png' });
  ACTION.setBadgeText({ tabId, text: feedUrls.length.toString() });
  ACTION.setBadgeBackgroundColor({ tabId, color: '#FF6600' });
  ACTION.setTitle({ tabId, title: `FireRSS (Found ${feedUrls.length} feeds)` });

  const popup = new URL(popup_url);
  popup.searchParams.set('feedlinks', JSON.stringify(feedUrls));
  ACTION.setPopup({ tabId, popup: popup.toString() });
};

const processSiteFeeds = async (tabId: number, tabInfo: browser.tabs.Tab) => {
  const settings = (await browser.storage.local.get('firerss_settings')).firerss_settings ?? (await InitDefaultSettings());
  const urlSanitized = sanitizeUrl(tabInfo.url);
  const cachedFeeds = sessionStorage.getItem(`firerss_feeds:${urlSanitized}`);

  if (isInvalidPage(tabInfo)) {
    updateBadge(tabId, Status.BROWSER_PAGE);
    return;
  }

  if (isIgnoredSite(settings.ignored_sites, tabInfo.url)) {
    updateBadge(tabId, Status.SITE_IGNORED);
    return;
  }

  if (cachedFeeds) {
    const parsedFeeds = JSON.parse(cachedFeeds);
    parsedFeeds.length > 0
      ? updatePopupState(tabId, parsedFeeds)
      : updateBadge(tabId, Status.NO_FEEDS);
    return;
  }

  await executeFeedDiscovery(tabId, tabInfo, urlSanitized);
};

const isInvalidPage = (tabInfo: browser.tabs.Tab) =>
  tabInfo.url === popup_url ||
  tabInfo.url === undefined ||
  ['chrome://', 'about:', 'file://'].includes(new URL(tabInfo.url).protocol);

const isIgnoredSite = (ignoredSites: string[], url: string) => ignoredSites.some(site => url.match(new RegExp(site, 'gi')));

const executeFeedDiscovery = async (tabId: number, tabInfo: browser.tabs.Tab, urlSanitized: string) => {
  try {
    const injection = await browser.scripting.executeScript({
      target: { tabId },
      func: findAllFeeds,
    });

    const feedUrls: string[] = injection.flatMap(result => result.result);

    sessionStorage.setItem(`firerss_feeds:${urlSanitized}`, JSON.stringify(feedUrls));

    feedUrls.length > 0 ? updatePopupState(tabId, feedUrls) : updateBadge(tabId, Status.NO_FEEDS);
  } catch (error) {
    console.error(`FireRSS Discovery Error: ${error}`);
    updateBadge(tabId, Status.NO_FEEDS);
  }
};

const setupListeners = () => {
  browser.tabs.onUpdated.addListener((tabId, status, tabInfo) => {
    if (status.status !== 'complete' || !tabInfo) return;
    updateBadge(tabId, Status.LOADING);
    processSiteFeeds(tabId, tabInfo);
  });

  browser.tabs.onActivated.addListener(({ tabId }) => {
    updateBadge(tabId);
    browser.tabs.get(tabId).then(tabInfo => processSiteFeeds(tabId, tabInfo));
  });

  browser.runtime.onInstalled.addListener(() => updateBadge());
};

setupListeners();