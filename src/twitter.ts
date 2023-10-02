import DataSource from "./DataSource"
const eleventyImg = require("@11ty/eleventy-img")
const eleventyFetch = require("@11ty/eleventy-fetch")
import fs from "fs"
import fsp from "fs/promises"
import { Tweet } from './types'
import { params } from './index'
import { ELEVENTY_IMG_OPTIONS, isValidHttpUrl } from './utils'


const dataSource = new DataSource()

let USERNAME = ''


export default class Twitter {



	async getImage(remoteImageUrl, alt) {
		let stats = await eleventyImg(remoteImageUrl, ELEVENTY_IMG_OPTIONS)
		let path = stats.jpeg[0].outputPath
		return { path, alt }
	}

	async saveVideo(remoteVideoUrl, localVideoPath) {
		let videoBuffer = await eleventyFetch(remoteVideoUrl)

		if (!fs.existsSync(localVideoPath)) {
			await fsp.writeFile(localVideoPath, videoBuffer)
		}
	}

	async getMedia(tweet) {
		let local_media = []
		let textReplacements = new Map()

		// linkify urls
		if (tweet.entities) {
			for (let url of tweet.entities.urls) {
				// Remove photo URLs
				if (url.expanded_url && url.expanded_url.indexOf(`/${tweet.id}/photo/`) > -1) {
					textReplacements.set(url.url, { newString: "" })
				} else {
					textReplacements.set(url.url, { newString: url['expanded_url'] })
				}
			}

			for (let mention of tweet.entities.user_mentions) {
				textReplacements.set(mention.screen_name, {
					regex: new RegExp(`@${mention.screen_name}`, "i"),
					newString: `https://twitter.com/${mention.screen_name}`,
				})
			}
		}

		if (tweet.extended_entities) {
			for (let media of tweet.extended_entities.media) {
				if (media.type === "photo") {
					// remove photo URL
					textReplacements.set(media.url, { newString: "" })

					try {
						local_media.push(await this.getImage(media.media_url_https, media.alt_text || ""))
					} catch (e) {
						console.log("Image request error", e.message)
						local_media.push(media.media_url_https)
					}
				} else if (media.type === "animated_gif" || media.type === "video") {
					if (media.video_info && media.video_info.variants) {
						textReplacements.set(media.url, { newString: "" })
						let videoResults = media.video_info.variants.filter(video => {
							return video.content_type === "video/mp4" && video.url
						}).sort((a, b) => {
							return parseInt(b.bitrate) - parseInt(a.bitrate)
						})

						if (videoResults.length === 0) {
							continue
						}

						let remoteVideoUrl = videoResults[0].url

						try {
							let videoUrl = remoteVideoUrl
							videoUrl = `video/${tweet.id}.mp4`
							await this.saveVideo(remoteVideoUrl, `./${videoUrl}`)
							local_media.push({ path: videoUrl })
						} catch (e) {
							console.log("Video request error", e.message)
						}
					}
				}
			}
		}

		return { local_media, textReplacements }

	}

	async getFullTweet(tweet: Tweet, first = false): Promise<Tweet> {
		let text = tweet.full_text

		let { local_media, textReplacements } = await this.getMedia(tweet)

		for (let [key, { regex, newString }] of textReplacements) {
			text = text.replace(regex || key, newString)
		}

		tweet['local_media'] = local_media
		tweet.full_text = text

		if (!first && params.mergeQuote) {
			tweet = await this.replaceByQuotedTweet(tweet)
		}
		return tweet
	}

	// TODO : insert QT without deleting
	// TODO: et si plusieurs QT ?
	async replaceByQuotedTweet(tweet: Tweet): Promise<Tweet> {

		if (isValidHttpUrl(tweet.full_text)) {

			const userNameMatcher = new RegExp("https\:\/\/twitter\.com\/" + USERNAME)

			if (userNameMatcher.test(tweet.full_text)) {

				const idMatcher = new RegExp(USERNAME + "\/status\/([0-9]*)$")
				const quoted_tweet_ID = tweet.entities.urls[0].expanded_url.match(idMatcher)[1]
				const QT = (await dataSource.getRepliesToId(quoted_tweet_ID))[0]
				return await this.getFullTweet(QT)
			}
		}
		else return tweet

	}

	async startThread(id: string) {

		let thread = []

		// We need a first tweet to kickstart the thread.
		// Difference with Tweetback: we only traverse thread from old to new.
		// No new to old and no starting in the middle.
		const firstTweet = await dataSource.getTweetById(id)
		thread.push(await this.getFullTweet(firstTweet, true))

		// Grabbing your username along the way.
		USERNAME = firstTweet.in_reply_to_screen_name

		return await this.generateThread(firstTweet, thread)
	}

	async generateThread(tweet: Tweet, thread: Tweet[]) {

		// Maybe you posted several replies to your tweet, so we get them all.
		let replies = await dataSource.getRepliesToId(tweet.id_str) || []


		if (!replies.length) {
			console.log(`thread of ${thread.length} messages, about ${thread[0].full_text.slice(0, 50)}...`)

			return thread
		}

		for (let replyTweet of replies) {
			const fullTweet = await this.getFullTweet(replyTweet)
			thread.push(fullTweet)
			return await this.generateThread(fullTweet, thread)

		}
		return { tweet, thread }

	}


}