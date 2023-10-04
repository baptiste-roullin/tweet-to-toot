
import { config } from 'dotenv'
config()
import timers from 'node:timers/promises'
import { createRestAPIClient } from "masto"
import { err } from './utils'
import fs from "node:fs"
import { Blob } from 'buffer'
import { params } from './index'
const entities = require("entities")

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

async function publishToot(tweet, id = null) {
	if (tweet.local_media) {
		const attachments = await Promise.all(
			tweet.local_media.map(async image => {
				const file = fs.readFileSync(image.path)
				return masto.v2.media.create({
					file: new Blob([file]),
					description: image?.alt,
				})
			}))
		var attachmentIDs = attachments.map(attach => attach.id) || null
	}
	else {
		attachmentIDs = []
	}

	const status = await masto.v1.statuses.create({
		mediaIds: attachmentIDs,
		status: entities.decodeHTML(tweet.full_text),
		visibility: "public",
		inReplyToId: id || null,
		language: (tweet.lang === '' || tweet.lang === 'zxx' ? process.env.LANG : tweet.lang)
	})
	return status

}


//publishTooot("test reply",  /*[{ path: "zYIkgWeIS_.jpeg", alt: "test" }], 111077353297617849*/)

export async function publishMastoThread(thread) {

	if (params.intro) {
		const status = await masto.v1.statuses.create({
			status: params.intro,
			visibility: "public",
		})
		var nextID = status.id
		var publishedURL
	}
	else {
		nextID = ""
		publishedURL = ""
	}

	for (let tweet of thread) {
		const { id, uri } = await publishToot(tweet, nextID)
		nextID = id
		publishedURL = uri
		await timers.scheduler.wait(params.wait * 1000)

	}
	console.log(`last toot published at ${publishedURL}`)
}


