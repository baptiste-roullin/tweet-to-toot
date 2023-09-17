
//import publishToot from './masto.js'
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv


console.log(JSON.stringify(argv))

import Twitter from './twitter.js'

(async function () {


	interface Parameters {
		delay?: number
		concatWith?: string
		mergeQuote?: boolean
		ids: string[]
		intro?: string
	}

	console.log(argv.ids)



	function err(msg) {
		// Create an error without stack trace to avoid calculating the stack trace twice.
		Error.stackTraceLimit = 0
		throw new Error(msg)
	}

	async function generateThreads(id, intro = "") {
		const twitter = new Twitter()
		const twitterThread = await twitter.generateThread(id)

		//publishToot(twitterThread, intro)
	}

	// Define all this in yargs
	//https://github.com/yargs/yargs
	async function parseParams() {
		let params: Parameters = {
			ids: []
		}

		if (argv['wait']) {
			params.delay = argv['wait']
		}
		else {
			params.delay = 500

		}

		if (argv['concatWith']) {
			params.concatWith = argv['concatWith']
		}

		if (argv['mergeQuote']) {
			params.mergeQuote = (argv['mergeQuote'] === 'yes' ? true : false)
		}
		else {
			params.mergeQuote = false
		}

		if (argv['ids']) {
			params.ids = argv['ids'].split(',')
			params.intro = argv?.intro
			const { ids } = params

			ids.forEach(id => {
				if (isNaN(Number(id))) {
					err(`${id}: this string does not seem to be a proper id`)
				}
			})
			console.log(`Publishing ${ids.length} threads`)
			if (ids.length > 1) {
				await Promise.all(ids.map(id => generateThreads(id)))
				//await fsp.writeFile('threads.json', JSON.stringify(threads))
			}
			else {
				if (params.intro) {
					err("The intro parameter can only be used when you provide one thread ID ")
				}
				await generateThreads(ids[0], params.intro)
			}
		}
		else {
			err("You must provide or several ID, in the form --id=number,number")
		}
	}

	await parseParams()


})()
