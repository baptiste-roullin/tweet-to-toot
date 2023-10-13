import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
yargs(hideBin(process.argv))
import { err } from './utils'

export function parseParams() {
	const params = yargs(hideBin(process.argv))
		.options({
			'ids': {
				describe: 'list of comma-separated ids',
				demandOption: true,
				msg: 'You must provide or several ID, in the form --id=number,number',
				type: 'array'
			},
			'dry-run': {
				alias: 'd',
				describe: 'Show thread without publishing it',
				demandOption: false,
				msg: '',
				type: 'boolean'
			},
			'wait': {
				alias: 'w',
				describe: 'delay between each post, in seconds',
				demandOption: false,
				type: 'number',
				default: 1
			},
			'concatWith': { //TODO implémenter
				describe: 'Optional Mastodon message id. If provided, the thread will be messageed as a continuation of this message. Useful if you want merge threads.',
				alias: 'c',
				demandOption: false,
				type: 'boolean',
				default: false
			},
			'mergeQuote': {
				alias: 'm',
				describe: 'Defines behavior for quoted tweets of yourself. If false, it will keep the quote as a link to Twitter.com. If true, it will merge the quoting and the quoted message.',
				demandOption: false,
				type: 'boolean',
				default: false
			},
			'intro': {
				alias: 'i',
				describe: 'Append a message at the beginning of your Mastodon thread.',
				demandOption: false,
				type: 'string',
			},
			'lang': {
				alias: 'l',
				describe: 'Set language for the Mastodon thread. Use a 639-1 string ("en" for english, "fr" for french...)',
				demandOption: false,
				type: 'string',
			}
		})
		.parseSync() // parse() typings are more complex.



	params.ids.forEach(id => {
		if (isNaN(Number(id))) {
			err(`${id}: this string does not seem to be a proper id`)
		}
	})
	console.log(`Finding ${params.ids.length} threads`)

	return params

}