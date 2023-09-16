require('dotenv').config()
const Masto = require("masto")
const fs = require("node:fs")


const masto = Masto.createRestAPIClient({
	url: process.env.URL,
	accessToken: process.env.TOKEN,
})
async function publishToot(statusText, localImages, inReplyToId = null) {


	if (localImages) {
		const attachments = await Promise.all(
			localImages.map(async image => {
				return masto.v2.media.create({
					file: new Blob([fs.readFileSync("../img/" + image.path)]),
					description: image.alt,
				})
			}))
		var attachmentIDs = attachments.map(attach => attach.id) || null
	}
	else {
		attachmentIDs = null

	}
	if (tweet.inReplyToId) {
		const status = await masto.v1.statuses.create({
			mediaIds: attachmentIDs,
			status: statusText,
			visibility: "public",
			inReplyToId: inReplyToId
		})
		publishToot(tweet)
	}
	else {

	}


}

//publishTooot("test reply",  /*[{ path: "zYIkgWeIS_.jpeg", alt: "test" }], 111077353297617849*/)

async function publishMastoThread(tweet) {
	if (tweet.inReplyToId) {
		publishToot(tweet)
	}
	else {

	}
}


module.exports = publishToot