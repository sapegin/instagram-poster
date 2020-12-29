// Based on https://github.com/jamesgrams/instagram-poster

require('dotenv').config();
require('pptr-testing-library/extend');

const puppeteer = require('puppeteer');
const { waitFor } = require('pptr-testing-library');
const delayRange = require('delay').range;
const prompts = require('prompts');
const { getPhoto, markPhotoAsPublished } = require('./photo');

const delay = () => delayRange(44, 444);

const USER_AGENT =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1';

async function main() {
	console.debug('Getting photo information');
	const photo = await getPhoto();

	console.log(`Publishing ${photo.name}...`);

	console.debug('Launching Puppeteer');
	const browser = await puppeteer.launch({
		headless: false,
		slowMo: 42,
		defaultViewport: {
			width: 378,
			height: 812,
			isMobile: true,
		},
	});
	const page = await browser.newPage();

	// Instagram only allows posting on their mobile site, pretend we're on mobile
	page.setUserAgent(USER_AGENT);

	console.debug('Opening login page');
	await page.goto('https://www.instagram.com/accounts/login/', {
		waitUntil: 'networkidle2',
	});
	const loginDoc = await page.getDocument();

	console.debug('Waiting for the username input');
	await waitFor(() => loginDoc.findByLabelText(/username/i, { visible: true }));

	console.debug('Closing cookies dialog');
	await (await loginDoc.findByRole('button', { name: /accept/i })).click();

	console.debug('Typing in the username and password');
	await delay();
	await (await loginDoc.findByLabelText(/username/i)).type(
		process.env.IG_LOGIN
	);
	await delay();
	await (await loginDoc.findByLabelText(/password/i)).type(
		process.env.IG_PASSWORD
	);
	await delay();
	await (await loginDoc.findByRole('button', { name: /log in/i })).click();
	await delay();

	// TODO: Check #slfErrorAlert for errors

	console.debug('Waiting for the security code screen to load');
	await waitFor(() => loginDoc.findByRole('button', { name: /confirm/i }));

	console.log('Enter security code in the browser and press Confirm');

	console.debug('Waiting for the security code submission');
	await page.waitForNavigation();

	// TODO: Check #twoFactorErrorAlert for errors

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
	await (await mainDoc.findByRole('button', { name: /expand/i })).click();
	await delay();
	await (await mainDoc.findByRole('button', { name: /next/i })).click();
	await delay();

	console.debug('Adding metadata');
	await waitFor(() => mainDoc.findByLabelText(/write a caption/i));
	await delay();
	await (await mainDoc.findByLabelText(/write a caption/i)).type(photo.caption);
	await delay();

	console.debug('Allow user to do any changes to the photo');
	const { shouldPublish } = await prompts({
		type: 'confirm',
		name: 'shouldPublish',
		message: 'Publish photo?',
		initial: true,
	});

	if (shouldPublish) {
		console.debug('Posting photo');
		await waitFor(() => mainDoc.findByRole('button', { name: /^share$/i }));
		await delay();
		await (await mainDoc.findByRole('button', { name: /^share$/i })).click();
		await delay();

		await markPhotoAsPublished(photo);
	}

	await browser.close();

	console.log('🦜 Done!');
}

main();
