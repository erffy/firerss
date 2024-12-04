import { Settings } from '../types/settings_interface';

export const ApplyColorScheme = (color_scheme?: Settings['color_scheme']) => document.documentElement.setAttribute('color-scheme', ((window.matchMedia('(prefers-color-scheme: dark)').matches || color_scheme === 'dark') ? 'dark' : 'light'))

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => ApplyColorScheme(e.matches ? 'dark' : 'light'));
browser.storage.local.onChanged.addListener((changes) => changes.firerss_settings ? ApplyColorScheme(changes.firerss_settings.newValue.color_scheme) : false);