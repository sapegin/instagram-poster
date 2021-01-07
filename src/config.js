const { cosmiconfig } = require('cosmiconfig');

async function getConfig() {
	const explorer = cosmiconfig('instagram-poster');
	const result = await explorer.search();

	if (!result) {
		console.error(
			'Config file not found, create .instagram-posterrc.json file in your home directory.'
		);
		process.exit(1);
	}

	if (!result.config.photos && typeof result.config.photos !== 'string') {
		console.error(
			'No photos directory found in the config file, add "photos" key with a path to your photos'
		);
		process.exit(1);
	}

	return result.config;
}

module.exports = { getConfig };
