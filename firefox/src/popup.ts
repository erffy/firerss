import { ApplyColorScheme } from './lib/color_scheme';
import { ApplyTheme } from './lib/theme';
import { Settings } from './types/settings_interface';

let settings: Settings;

const initPopup = async () => {
	if (!settings) settings = (await browser.storage.local.get('firerss_settings')).firerss_settings;

	ApplyColorScheme(settings.color_scheme);
	ApplyTheme(settings.theme);

	const url = new URL(window.location.href);
	const feedUrls: string[] = JSON.parse(url.searchParams.get('feedlinks'));

	const feedList = document.getElementById('feed_url_list');
	const settingsButton = document.getElementById('settings_button');

	settingsButton?.addEventListener('click', () => browser.runtime.openOptionsPage());

	for (let feedUrl of feedUrls) {
		const tr = document.createElement('tr');
		const td1 = document.createElement('td');
		const td2 = document.createElement('td');
		const td3 = document.createElement('td');
		const a = document.createElement('a');
		const infoDiv = document.createElement('div');
		const copyBtn = document.createElement('button');

		if (feedUrl.startsWith('_')) {
			infoDiv.setAttribute('class', 'help-icon');
			infoDiv.setAttribute('aria-label', 'This feed was found by Extended Feed Scan');
			infoDiv.innerText = '!';
			feedUrl = feedUrl.slice(1);
		}

		td1.setAttribute('class', 'col1 feed_url');
		td2.setAttribute('class', 'col2 info_button_area');
		td3.setAttribute('class', 'col3 copy_button_area');
		a.setAttribute('class', 'feed_url_link');
		a.setAttribute('target', '_blank');
		a.setAttribute('href', feedUrl);
		a.setAttribute('title', feedUrl);
		a.innerText = feedUrl;
		copyBtn.setAttribute('class', 'copy_button');
		copyBtn.setAttribute('title', 'Copy to clipboard');
		copyBtn.setAttribute('value', feedUrl);
		copyBtn.innerText = 'Copy';

		td1.appendChild(a);
		if (infoDiv.innerText) {
			td2.appendChild(infoDiv);
			td2.appendChild(document.createTextNode('\u00A0'));
		}
		td3.appendChild(copyBtn);
		tr.appendChild(td1);
		tr.appendChild(td2);
		tr.appendChild(td3);
		feedList.appendChild(tr);
	}

	const copyButtons = document.querySelectorAll('.copy_button');
	for (let index = 0, button = copyButtons[index] as HTMLButtonElement; index < copyButtons.length; index++) button.addEventListener('click', async (event) => {
		await navigator.clipboard.writeText((event.target as HTMLButtonElement).value);
		button.innerText = 'Copied!';
		setTimeout(() => button.innerText = 'Copy', 2000);
	});
};

(async () => {
	settings = (await browser.storage.local.get('firerss_settings')).firerss_settings;
	if (document.readyState === 'interactive' || document.readyState === 'complete') await initPopup();
	else document.addEventListener('DOMContentLoaded', initPopup, { once: true });
})();