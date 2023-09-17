require('dotenv').config()
import fs from "node:fs"
import timers from 'node:timers/promises'

import { createRestAPIClient } from "masto"


const masto = createRestAPIClient({
	url: process.env.URL,
	accessToken: process.env.TOKEN,
})
async function publishToot(tweet, inReplyToId = null) {
	if (tweet.localImages) {
		const attachments = await Promise.all(
			tweet.localImages.map(async image => {
				return masto.v2.media.create({
					file: new Blob([fs.readFileSync("../img/" + image.path)]),
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
		inReplyToId: inReplyToId || null
	})

	inReplyToId = status
	let uri = status.uri
	return { inReplyToId, uri }

}


//publishTooot("test reply",  /*[{ path: "zYIkgWeIS_.jpeg", alt: "test" }], 111077353297617849*/)

export async function publishMastoThread(thread, intro, delay) {

	if (intro) {
		const status = await masto.v1.statuses.create({
			status: intro,
			visibility: "public",
		})
		var nextID = status.inReplyToId
		var uri
	}
	else {
		nextID = ""
		uri = ""
	}

	for (let tweet of thread) {
		//appendPreface()
		const status = await publishToot(tweet)
		nextID = status.inReplyToId
		uri = status.uri
		await timers.scheduler.wait(delay) // Wait one second before continuing

	}
	console.log(`last toot published at ${uri}`)
}


