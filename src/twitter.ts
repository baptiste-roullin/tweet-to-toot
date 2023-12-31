import DataSource from "./DataSource"
import eleventyImg from "@11ty/eleventy-img"
import eleventyFetch from "@11ty/eleventy-fetch"
import fsp from "fs/promises"
import { Tweet } from './types'
import { params } from './cli'
import { ELEVENTY_IMG_OPTIONS, fileExists } from './utils'
import { join } from 'path'

//TODO : when Eleventy 3.0.0, it will fully ESM-compatible. We will be able to make the project ESM only.


const dataSource = new DataSource()


export default class Twitter {

	async getImage(remoteImageUrl: string, alt: string, id: string) {
		try {
			const imageName = remoteImageUrl.match(/media\/(.*\.(png|jpg|jpeg))$/)[1]
			const localPath = join(process.cwd(), ELEVENTY_IMG_OPTIONS.outputDir, id + '-' + imageName)

			if (await fileExists(localPath)) {
				return { path: localPath, alt }
			}
			else {
				let stats = await eleventyImg(remoteImageUrl, ELEVENTY_IMG_OPTIONS)
				let path = stats.jpeg[0].outputPath
				return { path, alt }
			}
		} catch (error) {
			console.log(error)
		}
	}


	async getVideo(remoteVideoUrl: string, localVideoPath: string, id: string) {
		try {
			const videoName = remoteVideoUrl.match(/\/vid\/.*\/(.*\.mp4).*$/)[1]
			const localPath = join(process.cwd(), ELEVENTY_IMG_OPTIONS.outputDir, id + '-' + videoName)

			if (await fileExists(localPath)) {
				return localPath
			}
			else {
				let videoBuffer = await eleventyFetch(remoteVideoUrl)

				if (!(await fileExists(localVideoPath))) {
					await fsp.writeFile(localVideoPath, videoBuffer)
				}
			}
		} catch (error) {
			console.log(error)
		}
	}

	async getMedia(tweet): Promise<{
		local_media: any[]
		textReplacements: Map<any, any>
	}> {
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

					const img = await this.getImage(media.media_url_https, media.alt_text, tweet.id_str)
					local_media.push(img)
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
						let videoUrl = `media/${tweet.id}.mp4`
						const finalPath = await this.getVideo(remoteVideoUrl, './' + videoUrl, tweet.id_str)
						local_media.push({ path: finalPath })
					}
				}
			}
		}
		return { local_media, textReplacements }

	}


	async getFullTweet(tweet: Tweet): Promise<Tweet> {
		let text = tweet.full_text

		let { local_media, textReplacements } = await this.getMedia(tweet)

		for (let [key, { regex, newString }] of textReplacements) {
			text = text.replace(regex || key, newString)
		}

		tweet.local_media = local_media
		tweet.full_text = text

		return tweet
	}


	async mergeQT(tweet: Tweet, userName: string): Promise<Tweet> {

		const userNameMatcher = new RegExp("https\:\/\/twitter\.com\/" + userName + "/status/")

		const urlOfQT = tweet.entities.urls.find(url => url.expanded_url.match(userNameMatcher))
		// array of arrays

		if (urlOfQT) {
			const idMatcher = new RegExp(userName + "\/status\/([0-9]*)")
			const quoted_tweet_ID = urlOfQT.expanded_url.match(idMatcher)[1]
			const QT = await dataSource.getTweetById(quoted_tweet_ID)
			const fullQT = await this.getFullTweet(QT)

			tweet.local_media.push(...fullQT.local_media)
			tweet.full_text = tweet.full_text + "\nQT ⬇️\n" + QT.full_text
			tweet.full_text = (tweet.full_text.length > 500 ? tweet.full_text.slice(0, 498) + "…" : tweet.full_text)
			return tweet
		}
		else {
			return tweet
		}
	}

	async startThread(id: string) {

		let thread = []

		// We need a first tweet to kickstart the thread.
		// Difference with Tweetback: we only traverse thread from old to new.
		// No new to old and no starting in the middle.
		const firstTweet = await dataSource.getTweetById(id)
		thread.push(await this.getFullTweet(firstTweet))

		return await this.generateThread(firstTweet, thread)
	}

	async generateThread(tweet: Tweet, thread: Tweet[]): Promise<{ tweet: Tweet; thread: Tweet[] }> {

		// Maybe you posted several replies to your tweet, so we get them all.
		let replies = await dataSource.getRepliesToId(tweet.id_str) || []
		// Grabbing your username along the way.


		if (replies.length) {

			const userName = replies[0].in_reply_to_screen_name

			for (const replyTweet of replies) {
				let fullTweet = await this.getFullTweet(replyTweet)
				if (params.mergeQuote) {
					fullTweet = await this.mergeQT(fullTweet, userName)
				}
				thread.push(fullTweet)
				await this.generateThread(fullTweet, thread)
			}
		}
		return { tweet, thread }




	}


}
