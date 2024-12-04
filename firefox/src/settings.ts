import { ApplyColorScheme } from './lib/color_scheme';
import { InitDefaultSettings } from './lib/init_default_settings';
import { ApplyTheme } from './lib/theme';
import { Settings } from './types/settings_interface';

const getElements = () => ({
  colorSchemeButtons: Array.from(document.querySelectorAll('.color_scheme_button')) as HTMLButtonElement[],
  themeSelector: document.getElementById('theme_selector') as HTMLSelectElement,
  ignoredUrlsTextarea: document.getElementById('ignored_urls') as HTMLTextAreaElement,
  extendedFeedScanButtons: Array.from(document.querySelectorAll('.extended_feed_scan_button')) as HTMLButtonElement[]
});

const updateButtonActive = (buttons: HTMLButtonElement[], activeValue: string) => {
  for (const button of buttons) button.classList.toggle('active', button.value === activeValue);
};

const saveColorScheme = (settings: Settings, color_scheme: Settings['color_scheme']) => {
  const updatedSettings = { ...settings, color_scheme };
  browser.storage.local.set({ firerss_settings: updatedSettings });
  return updatedSettings;
};

const saveTheme = async (settings: Settings, themeUrl: string) => {
  let themeData;

  if (themeUrl === 'default') themeData = { name: 'default', url: 'default', colors: {} };
  else {
    try {
      const response = await fetch(themeUrl);
      const theme = await response.json();
      themeData = {
        name: theme.theme,
        url: themeUrl,
        colors: theme.colors
      };
    } catch (error) {
      console.error('Theme loading failed:', error);
      return settings;
    }
  }

  const updatedSettings = { ...settings, theme: themeData };
  browser.storage.local.set({ firerss_settings: updatedSettings });
  return updatedSettings;
};

const saveIgnoredSites = (settings: Settings, ignoredUrls: string) => {
  const updatedSettings = {
    ...settings,
    ignored_sites: ignoredUrls.split('\n').filter(line => line.trim() !== '')
  };

  browser.storage.local.set({ firerss_settings: updatedSettings });
  return updatedSettings;
};

const toggleExtendedFeedScan = (settings: Settings, opt: 0 | 1 | 2) => {
  const updatedSettings = { ...settings, extended_feed_scan: opt };
  browser.storage.local.set({ firerss_settings: updatedSettings });
  return updatedSettings;
};

const loadThemes = async (themeSelector: HTMLSelectElement) => {
  try {
    const remote_theme_list = await fetch('https://api.github.com/repos/mt190502/firerss/contents/themes');
    const themes = await remote_theme_list.json() as { name: string; download_url: string }[];

    themeSelector.innerHTML = themes.reduce((html, theme) => {
      const themeName = theme.name.charAt(0).toUpperCase() + theme.name.slice(1).replace('.json', '');
      return html + `<option value="${theme.download_url}">${themeName}</option>`;
    }, '<option value="default">Default</option>');
  } catch (error) {
    console.error('Failed to load themes:', error);
    themeSelector.innerHTML = '<option value="default">Default</option>';
  }
};

const initializeSettings = async () => {
  const elements = getElements();

  await loadThemes(elements.themeSelector);

  const settingsStorage = await browser.storage.local.get('firerss_settings');
  const defaultSettings = await InitDefaultSettings();
  let settings = { ...defaultSettings, ...settingsStorage.firerss_settings };

  for (const button of elements.colorSchemeButtons) button.addEventListener('click', () => {
    settings = saveColorScheme(settings, button.value as Settings['color_scheme']);
    updateButtonActive(elements.colorSchemeButtons, settings.color_scheme);
    ApplyColorScheme(settings.color_scheme);
  })

  for (const button of elements.extendedFeedScanButtons) button.addEventListener('click', () => {
    const opt = Number(button.value) as 0 | 1 | 2;
    settings = toggleExtendedFeedScan(settings, opt);
    updateButtonActive(elements.extendedFeedScanButtons, opt.toString());
  })

  elements.themeSelector.addEventListener('change', async () => {
    settings = await saveTheme(settings, elements.themeSelector.value);
    ApplyTheme(settings.theme);
  });

  elements.ignoredUrlsTextarea.addEventListener('change', () => settings = saveIgnoredSites(settings, elements.ignoredUrlsTextarea.value));

  updateButtonActive(elements.colorSchemeButtons, settings.color_scheme);
  elements.themeSelector.value = settings.theme.url || 'default';
  elements.ignoredUrlsTextarea.value = settings.ignored_sites.join('\n') || '';
  updateButtonActive(elements.extendedFeedScanButtons, settings.extended_feed_scan.toString());

  ApplyColorScheme(settings.color_scheme);
  ApplyTheme(settings.theme);
};

document.addEventListener('DOMContentLoaded', initializeSettings);