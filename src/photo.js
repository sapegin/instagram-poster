const path = require('path');
const { readFile, readJson, writeJson } = require('fs-extra');
const untildify = require('untildify');
const fp = require('lodash/fp');
const differenceInYears = require('date-fns/differenceInYears');
const glob = require('glob');
const exifr = require('exifr');

const { flow, map, filter, flatten, shuffle, slice, sample } = fp.convert({
	cap: false,
});

const PUBLISHED_PHOTOS_FILE = path.resolve(__dirname, '../data/published.json');
const TAG_RULES_FILE = path.resolve(__dirname, '../data/tags.json');
const MAX_YEARS = 1;
const MAX_TAGS = 30;

async function getPublishedPhotos() {
	try {
		return await readJson(PUBLISHED_PHOTOS_FILE);
	} catch (err) {
		return [];
	}
}

async function getTagRules() {
	try {
		return await readJson(TAG_RULES_FILE);
	} catch (err) {
		return [];
	}
}

function generateTags(photo, rules) {
	return flow(
		(k) => rules.map((r) => (k.includes(r.keyword) ? r.tags : [])),
		flatten,
		shuffle,
		slice(0, MAX_TAGS)
	)(photo.keywords);
}

async function getPhoto(photosDir) {
	const allPhotoFiles = glob.sync(path.join(untildify(photosDir), '*.jpg'));
	const allPhotoExifs = await Promise.all(
		allPhotoFiles.map(async (file) => {
			const buffer = await readFile(file);
			return exifr.parse(buffer, {
				iptc: true,
				exif: true,
				gps: false,
			});
		})
	);

	const publishedPhotos = await getPublishedPhotos();
	const tagRules = await getTagRules();

	const photo = flow(
		map((p = {}, index) => ({
			file: allPhotoFiles[index],
			name: path.parse(allPhotoFiles[index]).name,
			title: p.ObjectName || '',
			caption: p.Caption,
			date: p.DateTimeOriginal && Date.parse(p.DateTimeOriginal),
			keywords: p.Keywords || [],
			camera: p.Make,
		})),
		filter((p) => p.camera !== 'Apple'),
		filter((p) => differenceInYears(p.date, Date.now()) < MAX_YEARS),
		filter((p) => !publishedPhotos.includes(p.name)),
		sample
	)(allPhotoExifs);

	if (!photo) {
		console.error('No unpublished photos found');
		process.exit(1);
	}

	const tags = generateTags(photo, tagRules);

	const caption = [
		[photo.title, photo.caption].filter(Boolean).join('\n\n'),
		tags.map((t) => `#${t}`).join(' '),
	]
		.filter(Boolean)
		.join('\n\n☙\n\n☙\n\n');

	return {
		name: photo.name,
		file: photo.file,
		caption,
	};
}

async function markPhotoAsPublished(photo) {
	const publishedPhotos = await getPublishedPhotos();
	return writeJson(PUBLISHED_PHOTOS_FILE, [...publishedPhotos, photo.name]);
}

module.exports = { getPhoto, markPhotoAsPublished };
