const { parseDomain } = require("parse-domain")
import DataSource from "./DataSource"
const eleventyImg = require("@11ty/eleventy-img")
const eleventyFetch = require("@11ty/eleventy-fetch")
import fs from "fs"
import fsp from "fs/promises"
import { Tweet } from './types'
import { params } from './index'


const dataSource = new DataSource()

const ELEVENTY_IMG_OPTIONS = {
	widths: [null],
	formats: ["jpeg"],
	// If you don’t want to check this into your git repository (and want to fetch them in your build)
	// outputDir: "./_site/img/",
	outputDir: "./img/",
	urlPath: "/img/",
	cacheDuration: "*",
	filenameFormat: function (id, src, width, format, options) {
		return `${id}.${format}`
	}
}



export default class Twitter {

	isValidHttpUrl(string) {
		let url
		try {
			url = new URL(string)
		} catch (_) {
			return false
		}
	}
	getLinkUrls(tweet) {
		let links = []

		if (tweet.entities && tweet.entities.urls) {
			for (let url of tweet.entities.urls) {
				try {
					let urlObj = new URL(url.expanded_url ?? url.url)
					let parsedDomain = parseDomain(urlObj.host)
					let domain
					if (parsedDomain.topLevelDomains) {
						const tld = parsedDomain.topLevelDomains.join(".")
						domain = `${parsedDomain.domain}.${tld}`
					} else {
						domain = urlObj.host
					}
					links.push({
						host: urlObj.host,
						origin: urlObj.origin,
						domain: domain
					})
				} catch (e) {
					console.log(e)
				}
			}
		}

		return links
	}

	isRetweet(tweet) {
		return tweet && (
			tweet.full_text.startsWith("RT ") ||
			// alternate version of manual old school retweet
			tweet.full_text.startsWith("RT: ")
		)
	}



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

	async getFullTweet(tweet) {
		let text = tweet.full_text

		//if (params.mergeQuote) {
		//	if (this.isValidHttpUrl(tweet['full_text'])) {
		//		tweet = this.replaceQuotingTweetByQuotedTweet(tweet)[0] //TODO : FAIL. et si plusieurs QT ?
		//	}
		//}

		let { local_media, textReplacements } = await this.getMedia(tweet)

		for (let [key, { regex, newString }] of textReplacements) {
			text = text.replace(regex || key, newString)
		}

		tweet['local_media'] = local_media
		tweet.full_text = text

		return tweet
	}

	async startThread(id) {
		const firstTweet = await dataSource.getTweetById(id)
		params.userName = firstTweet.in_reply_to_screen_name
		//console.log(firstTweet)
		console.log(`thread about ${firstTweet.full_text.slice(0, 50)}...`)
		return await this.generateThread(firstTweet)
	}

	async generateThread(firstTweet: Tweet): Promise<Tweet[]> {

		let replies = await dataSource.getRepliesToId(firstTweet.id_str) || []

		let thread = []
		thread.push(await this.getFullTweet(firstTweet))
		if (!replies.length) {
			return thread
		}
		for (let replyTweet of replies) {
			let nextTweet = await this.generateThread(replyTweet)
			const fullTweet = await this.getFullTweet(nextTweet)
			thread.push(...fullTweet)
		}
		return thread

	}
	async replaceQuotingTweetByQuotedTweet(replyTweet) {
		const idMatcher = new RegExp(params.userName + "\/status\/(\d*$)")
		const quoted_tweet_ID = replyTweet.entities.url[0].expanded_url.match(idMatcher)[1]
		return (await dataSource.getRepliesToId(quoted_tweet_ID))
	}

}
