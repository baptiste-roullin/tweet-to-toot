require('dotenv').config()
import fs from "node:fs"
import timers from 'node:timers/promises'
import { createRestAPIClient } from "masto"
import { err } from './utils'
import path from "node:path"
import { Params } from './types'

//TODO : suppression d'url

if (!process.env.URL) {
	err("You must provide an instance URL")
}
if (!process.env.TOKEN) {
	err("You must provide an API token")
}
const masto = createRestAPIClient({
	url: process.env.URL,
	accessToken: process.env.TOKEN
})

async function publishToot(tweet, id = null, params) {
	if (tweet.local_media) {
		const attachments = await Promise.all(
			tweet.local_media.map(async image => {
				return masto.v2.media.create({
					file: new Blob([fs.readFileSync(image.path)]),
					description: image.alt,
				})
			}))
		var attachmentIDs = attachments.map(attach => attach.id) || null
	}
	else {
		attachmentIDs = []
	}

	const status = await masto.v1.statuses.create({
		mediaIds: attachmentIDs,
		status: tweet.full_text, // renderFullText() ?
		visibility: "public",
		inReplyToId: id || null,
		language: (tweet.lang === '' || tweet.lang === 'zxx' ? process.env.LANG : tweet.lang)
	})
	return status

}


//publishTooot("test reply",  /*[{ path: "zYIkgWeIS_.jpeg", alt: "test" }], 111077353297617849*/)

export async function publishMastoThread(thread, params) {

	if (params.intro) {
		const status = await masto.v1.statuses.create({
			status: params.intro,
			visibility: "public",
		})
		var nextID = status.inReplyToId
		var publishedURL
	}
	else {
		nextID = ""
		publishedURL = ""
	}

	for (let tweet of thread) {
		//appendPreface()
		const { id, uri } = await publishToot(tweet, nextID, params)
		nextID = id
		publishedURL = uri
		await timers.scheduler.wait(params.wait) // Wait one second before continuing

	}
	console.log(`last toot published at ${publishedURL}`)
}


