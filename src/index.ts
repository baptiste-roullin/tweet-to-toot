
import { publishMastoThread } from './masto'
import { parseParams } from './parseParams'
import Twitter from './twitter'
import { err } from './utils'


//TODO : alert si le thread répond à un autre compte.
//TODO : mode dry run


export const params = parseParams();


(async function () {


	async function generateThread(id: string) {
		const twitter = new Twitter()
		const twitterThread = await twitter.startThread(id)

		if (params['dry-run']) {
			twitterThread.forEach(el => {
				console.log(`
${el.date}
${el.full_text}
====================`)
			})
		}
		else { await publishMastoThread(twitterThread) }
	}

	const ids = params.ids as string[]

	if (ids.length > 1) {
		if (params.intro) {
			err("The intro parameter can be used when you provide only sone thread ID ")
		}
		await Promise.all(ids.map(id => generateThread(id)))

	}
	else {

		await generateThread(ids[0])
	}

})()
