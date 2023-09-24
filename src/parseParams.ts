import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
yargs(hideBin(process.argv))
import { err } from './utils'

export function parseParams() {
	const params = yargs(hideBin(process.argv))
		.options({
			'ids': {
				alias: 'id',
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
			'wait': { //TODO implémenter
				describe: '',
				demandOption: false,
				type: 'number',
				default: 500
			},
			'concatWith': { //TODO implémenter
				describe: '',
				demandOption: false,
				type: 'boolean',
				default: false
			},
			'mergeQuote': { //TODO implémenter
				describe: '',
				demandOption: false,
				type: 'boolean',
				default: false
			},
			'intro': { //TODO implémenter
				describe: '',
				demandOption: false,
				type: 'string',
			}
		})
		.parseSync()



	params.ids.forEach(id => {
		if (isNaN(Number(id))) {
			err(`${id}: this string does not seem to be a proper id`)
		}
	})
	console.log(`Publishing ${params.ids.length} threads`)

	return params

}