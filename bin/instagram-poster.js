#!/usr/bin/env node
/* eslint-disable no-console */

const minimist = require('minimist');
const kleur = require('kleur');
const longest = require('longest');
const { padEnd } = require('lodash');
const { publishPhoto } = require('../src');

const BIN_NAME = require('../package.json').name;
const EXAMPLES = [
	['<photo>', 'Publish a specified photo instead of a random one'],
];

function commandHelp() {
	console.log([kleur.underline('Usage'), getUsage()].join('\n\n'));
}

function getUsage() {
	const commands = EXAMPLES.map((x) => x[0]);
	const commandsWidth = longest(commands).length;
	return EXAMPLES.map(([command, description]) =>
		[
			'   ',
			kleur.bold(BIN_NAME),
			kleur.cyan(command),
			padEnd('', commandsWidth - command.length),
			description && `# ${description}`,
		].join(' ')
	).join('\n');
}

async function main() {
	const argv = minimist(process.argv.slice(2), { alias: { h: 'help' } });

	if (argv.help) {
		commandHelp();
		process.exit(0);
	}

	await publishPhoto(argv._[0]);
}

main();
