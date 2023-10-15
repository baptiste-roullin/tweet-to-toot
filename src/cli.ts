#!/usr/bin/env node
import { publishMastoThread } from './masto'
import { parseParams } from './parseParams'
import Twitter from './twitter'
import { err } from './utils'
import { importFromArchive } from './database/tweet-to-db'

export const params = parseParams();

(async function () {

	async function launch() {
		const ids = params.ids as string[]

		if (ids.length > 1) {
			if (params.intro) {
				err("The intro parameter can be used when you provide only sone thread ID ")
			}
			if (params.concatWith) {
				err("The concatWith parameter can be used when you provide only sone thread ID ")
			}
			await Promise.all(ids.map(id => generateThread(id)))
		}
		else {

			await generateThread(ids[0])
		}
	}

	async function generateThread(id: string) {
		const twitter = new Twitter()
		const { thread } = await twitter.startThread(id)
		console.log(`thread of ${thread.length} messages, about ${thread[0].full_text.slice(0, 50)}...`)

		if (params['dry-run']) {
			thread.forEach(el => {
				console.log(`
${el.date}
${el.full_text}
====================`)
			})
		}
		else { await publishMastoThread(thread) }
	}

	(await importFromArchive()).on('finish', launch)


})();

