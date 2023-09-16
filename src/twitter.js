const { parseDomain } = require("parse-domain")
const dataSource = require("./DataSource")
const eleventyImg = require("@11ty/eleventy-img")
const eleventyFetch = require("@11ty/eleventy-fetch")
const fs = require("fs")
const fsp = fs.promises
const { escapeAttribute } = require("entities/lib/escape.js")

const userName = 'saint_loup'


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



class Twitter {

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
		// TODO the await use here on eleventyImg could be improved
		let stats = await eleventyImg(remoteImageUrl, ELEVENTY_IMG_OPTIONS)
		let path = stats.jpeg[0].url
		return { path, alt }
	}

	async saveVideo(remoteVideoUrl, localVideoPath) {
		let videoBuffer = await eleventyFetch(remoteVideoUrl)

		if (!fs.existsSync(localVideoPath)) {
			await fsp.writeFile(localVideoPath, videoBuffer)
		}
	}

	async getMedia(tweet) {
		let { transform: twitterLink } = await import("@tweetback/canonical")
		let medias = []
		let textReplacements = new Map()



		if (tweet.extended_entities) {
			for (let media of tweet.extended_entities.media) {
				if (media.type === "photo") {
					// remove photo URL
					textReplacements.set(media.url, { html: "" })

					try {
						medias.push(await this.getImage(media.media_url_https, media.alt_text || ""))
					} catch (e) {
						console.log("Image request error", e.message)
						medias.push(media.media_url_https)
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
							medias.push(imgRef.url)
						} catch (e) {
							console.log("Video request error", e.message)
							medias.push(`<a href="${remoteVideoUrl}">${remoteVideoUrl}</a>`)
						}
					}
				}
			}
		}

		return {
			medias,
			textReplacements,
		}
	}
	async generateThread(tweet) {
		let replies = await dataSource.getRepliesToId(tweet.id_str) || []
		if (!replies.length) {
			return ""
		}
		let thread = []
		for (let replyTweet of replies) {
			let nextTweet = await this.generateThread(replyTweet,)
			if (this.isValidHttpUrl(replyTweet.full_text)) {
				replyTweet = await this.replaceQuotingTweetByQuotedTweet(replyTweet)
			}
			// TODO : fail
			replyTweet.localMedia = await this.getMedia(replyTweet)
			thread.push(replyTweet)
			thread.push(...nextTweet)

		}
		return thread

	}
	async replaceQuotingTweetByQuotedTweet(replyTweet) {
		const idMatcher = new RegExp(userName + "\/status\/(\d*$)")
		const quoted_tweet_ID = replyTweet.entities.url[0].expanded_url.match(idMatcher)[1]
		return (await dataSource.getRepliesToId(quoted_tweet_ID)) || []
	}

}
module.exports = Twitter
