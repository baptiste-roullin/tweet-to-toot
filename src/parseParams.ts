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
				default: 0.5
			},
			'concatWith': { //TODO implémenter
				describe: '',
				alias: 'c',
				demandOption: false,
				type: 'boolean',
				default: false
			},
			'mergeQuote': {
				alias: 'm',
				describe: '',
				demandOption: false,
				type: 'boolean',
				default: false
			},
			'intro': {
				alias: 'i',
				describe: '',
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