
import { publishMastoThread } from './masto'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

yargs(hideBin(process.argv))


import Twitter from './twitter'
import { err } from './utils'
import { Params } from './types.d'



(async function () {



	async function parseParams() {
		const params = await yargs(hideBin(process.argv))
			.options({
				'ids': {
					alias: 'id',
					describe: 'list of comma-separated ids',
					demandOption: true,
					msg: 'You must provide or several ID, in the form --id=number,number',
					type: 'array'
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
			.parse()



		params.ids.forEach(id => {
			if (isNaN(Number(id))) {
				err(`${id}: this string does not seem to be a proper id`)
			}
		})
		console.log(`Publishing ${params.ids.length} threads`)

		return params

	}

	async function generateThread(id: string, params) {
		const twitter = new Twitter()
		const twitterThread = await twitter.startThread(id, params)

		//await twitter.startThread("1471882481251069953")

		await publishMastoThread(twitterThread, params)
	}


	const params = await parseParams()
	const ids = params.ids as string[]

	if (ids.length > 1) {
		await Promise.all(ids.map(id => generateThread(id, params)))
		//await fsp.writeFile('threads.json', JSON.stringify(threads))
	}
	else {
		if (params.intro) {
			err("The intro parameter can only be used when you provide one thread ID ")
		}
		await generateThread(ids[0], params)
	}

})()
