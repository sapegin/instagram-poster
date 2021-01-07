require('pptr-testing-library/extend');

const path = require('path');
const { readJson, writeJson } = require('fs-extra');
const puppeteer = require('puppeteer');
const { waitFor } = require('pptr-testing-library');
const delayRange = require('delay').range;
const { getPhoto, markPhotoAsPublished } = require('./photo');
const { getConfig } = require('./config');

const delay = () => delayRange(44, 444);

const COOKIES_FILE = path.resolve(__dirname, '../.cookies');
const USER_AGENT =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1';

async function loadCookies() {
	try {
		return await readJson(COOKIES_FILE);
	} catch (err) {
		return [];
	}
}

async function main() {
	console.debug('Reading config file');
	const config = await getConfig();

	console.debug('Getting photo information');
	const photo = await getPhoto(config.photos);

	console.log(`Publishing ${photo.name}...`);

	console.debug('Launching Puppeteer');
	const browser = await puppeteer.launch({
		headless: false,
		slowMo: 13,
		defaultViewport: {
			width: 378,
			height: 812,
			isMobile: true,
		},
	});
	const page = await browser.newPage();

	// Instagram only allows posting on their mobile site, pretend we're on mobile
	page.setUserAgent(USER_AGENT);

	console.debug('Load athentication cookies from a file if it exists');
	const cookies = await loadCookies();
	await page.setCookie(...cookies);

	if (cookies.length === 0) {
		console.debug('Opening login page');
		await page.goto('https://www.instagram.com/accounts/login/', {
			waitUntil: 'networkidle2',
		});
		const loginDoc = await page.getDocument();

		console.debug('Waiting for the username input');
		await waitFor(() =>
			loginDoc.findByLabelText(/username/i, { visible: true })
		);

		console.debug('Closing cookies dialog');
		try {
			await (await loginDoc.findByRole('button', { name: /accept/i })).click();
		} catch (err) {
			console.debug('No cookies dialog, skipping');
		}

		console.log('Enter login and password in the browser and press Log in');

		console.debug('Waiting for the security code screen to load');
		await waitFor(() => loginDoc.findByRole('button', { name: /confirm/i }));

		console.log('Enter security code in the browser and press Confirm');

		console.debug('Waiting for the security code submission');
		await page.waitForNavigation();

		console.debug('Saving cookies');
		writeJson(COOKIES_FILE, await page.cookies());
	}

	console.debug('Opening home page');
	await page.goto('https://www.instagram.com/', {
		waitUntil: 'networkidle2',
	});
	await page.waitForSelector("input[type='file']");
	const mainDoc = await page.getDocument();

	console.debug('Uploading photo');
	const [fileChooser] = await Promise.all([
		page.waitForFileChooser(),
		(await mainDoc.findByTestId('new-post-button')).click(),
	]);
	await fileChooser.accept([photo.file]);
	await delay();

	console.debug('Editing photo');
	await waitFor(() => mainDoc.findByRole('button', { name: /next/i }));
	await delay();
	try {
		await (await mainDoc.findByRole('button', { name: /expand/i })).click();
		await delay();
	} catch (err) {
		// Expand button is missing on square photos
	}
	await (await mainDoc.findByRole('button', { name: /next/i })).click();
	await delay();

	console.debug('Adding metadata');
	await waitFor(() => mainDoc.findByLabelText(/write a caption/i));
	await delay();
	await (await mainDoc.findByLabelText(/write a caption/i)).type(photo.caption);

	console.log('Change the photo as you like and press Share');

	console.debug('Waiting for the photo to be posted');
	await waitFor(() => mainDoc.findByText(/your photo was posted/i));

	await markPhotoAsPublished(photo);

	await delayRange(4444, 5555);

	await await browser.close();

	console.log('🦜 Done!');
}

main();
