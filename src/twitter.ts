const { parseDomain } = require("parse-domain")
import DataSource from "./DataSource"
const eleventyImg = require("@11ty/eleventy-img")
const eleventyFetch = require("@11ty/eleventy-fetch")
import fs from "fs"
import fsp from "fs/promises"
import { Tweet } from './types'
import { transform as twitterLink } from "@tweetback/canonical"


let userName = ""
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

	//async renderFullText(tweet) {
	//	let text = tweet.full_text

	//	// Markdown
	//	// replace `*` with <code>*</code>
	//	text = text.replace(/\`([^\`]*)\`/g, "<code>$1</code>")

	//	let { local_media, textReplacements } = await this.getMedia(tweet)

	//	for (let [key, { regex, html }] of textReplacements) {
	//		text = text.replace(regex || key, html)
	//	}

	//	if (local_media.length) {
	//		//	text += `<is-land on:visible><div class="tweet-medias">${medias.join("")}</div></is-land>`
	//	}

	//	return text
	//}


	getUrlObject(url) {
		let expandedUrl = url.expanded_url ?? url.url
		let displayUrl = expandedUrl
		let className = "tweet-url"
		let targetUrl = expandedUrl

		// Links to my tweets
		if (displayUrl.startsWith(`https://twitter.com/${userName}/status/`)) {
			targetUrl = `/${expandedUrl.substr(`https://twitter.com/${userName}/status/`.length)}`
		}

		// Links to other tweets
		if (displayUrl.startsWith("https://twitter.com") && displayUrl.indexOf("/status/") > -1) {
			displayUrl = displayUrl.substring("https://twitter.com/".length)
			displayUrl = displayUrl.replace("/status/", "/")
			displayUrl = `@${displayUrl}`
			// displayUrl = displayUrl.replace(/(\d+)/, function(match) {
			// 	return "" + (match.length > 6 ? "…" : "") + match.substr(-6);
			// });
			className = "tweet-username"
		} else {
			if (displayUrl.startsWith("http://")) {
				displayUrl = displayUrl.substring("http://".length)
			}
			if (displayUrl.startsWith("https://")) {
				displayUrl = displayUrl.substring("https://".length)
			}
			if (displayUrl.startsWith("www.")) {
				displayUrl = displayUrl.substring("www.".length)
			}
		}
		return {
			displayUrl,
			className,
			targetUrl,
		}
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


		if (tweet.extended_entities) {
			for (let media of tweet.extended_entities.media) {
				if (media.type === "photo") {
					// remove photo URL
					textReplacements.set(media.url, { html: "" })

					try {
						local_media.push(await this.getImage(media.media_url_https, media.alt_text || ""))
					} catch (e) {
						console.log("Image request error", e.message)
						local_media.push(media.media_url_https)
					}
				} else if (media.type === "animated_gif" || media.type === "video") {
					if (media.video_info && media.video_info.variants) {
						textReplacements.set(media.url, { html: "" })

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
							let posterStats = await eleventyImg(media.media_url_https, ELEVENTY_IMG_OPTIONS)
							if (!this.isRetweet(tweet)) {
								videoUrl = `/video/${tweet.id}.mp4`

								await this.saveVideo(remoteVideoUrl, `.${videoUrl}`)
							}
							let imgRef = posterStats.jpeg[0]
							local_media.push(imgRef.url)
						} catch (e) {
							console.log("Video request error", e.message)
							local_media.push(`<a href="${remoteVideoUrl}">${remoteVideoUrl}</a>`)
						}
					}
				}
			}
		}

		return local_media

	}

	async getFullTweet(tweet, params) {
		if (params.mergeQuote) {
			if (this.isValidHttpUrl(tweet['full_text'])) {
				tweet = this.replaceQuotingTweetByQuotedTweet(tweet)[0] //TODO et si plusieurs QT ?
			}
		}			// TODO : fail
		tweet['local_media'] = await this.getMedia(tweet)
		return tweet
	}

	async startThread(id, params) {
		const firstTweet = await dataSource.getTweetById(id)
		//console.log(firstTweet)
		console.log(`thread about ${firstTweet.full_text.slice(0, 50)}...`)
		return await this.generateThread(firstTweet, params)
	}

	async generateThread(firstTweet: Tweet, params) {

		let replies = await dataSource.getRepliesToId(firstTweet.id_str) || []

		let thread = []
		thread.push(await this.getFullTweet(firstTweet, params))
		if (!replies.length) {
			return thread
		}
		for (let replyTweet of replies) {
			let nextTweet = await this.generateThread(replyTweet, params) // TODO ??
			const fullTweet = await this.getFullTweet(nextTweet, params)
			thread.push(...nextTweet)
		}
		return thread

	}
	async replaceQuotingTweetByQuotedTweet(replyTweet) {
		const idMatcher = new RegExp(userName + "\/status\/(\d*$)")
		const quoted_tweet_ID = replyTweet.entities.url[0].expanded_url.match(idMatcher)[1]
		return (await dataSource.getRepliesToId(quoted_tweet_ID))
	}

}
