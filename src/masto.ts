
import { config } from 'dotenv'
config()
import timers from 'node:timers/promises'
import fs from "node:fs"
import { Blob } from 'buffer'
import { createRestAPIClient } from "masto"
import { decodeHTML } from "entities"
import { err } from './utils'
import { params } from './cli'
import { Tweet } from './types'

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


async function prepareMedia(tweet): Promise<string[]> {
	const attachments = await Promise.all(
		tweet.local_media.filter(image => image !== undefined).map(async image => {
			try {
				const file = fs.readFileSync(image.path)
				return masto.v2.media.create({
					file: new Blob([file]),
					description: image?.alt || "",
				})
			} catch (error) {
				console.log(error)
			}
		})
	)
	return attachments.map(attach => attach.id)
}

async function publishToot(tweet: Tweet, id = null) {
	if (tweet.local_media.length > 0) {
		var attachmentIDs = await prepareMedia(tweet)
	}
	else {
		var attachmentIDs = [""]
	}

	const status = await masto.v1.statuses.create({
		mediaIds: attachmentIDs,
		status: decodeHTML(tweet.full_text),
		visibility: "public",
		inReplyToId: id || null,
		language: params.lang || (tweet.lang === 'zxx' ? "" : tweet.lang) || ""
	})
	return status
}

export async function publishMastoThread(thread: Tweet[]) {
	let nextID = ""
	let publishedURL = ""

	if (params.concatWith) {
		nextID = params.concatWith
	}
	if (params.intro) {
		const status = await masto.v1.statuses.create({
			status: params.intro,
			visibility: "public",
			inReplyToId: nextID || null,
		})
		nextID = status.id
	}


	for (let tweet of thread) {
		const { id, uri } = await publishToot(tweet, nextID)
		nextID = id
		publishedURL = uri
		await timers.scheduler.wait(params.wait * 1000)

	}
	console.log(`last toot published at ${publishedURL}`)
}


