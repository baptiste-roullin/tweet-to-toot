const { parseDomain } = require("parse-domain")
const dataSource = require("./DataSource")
const metadata = require("../_data/metadata.js")
const eleventyImg = require("@11ty/eleventy-img")
const eleventyFetch = require("@11ty/eleventy-fetch")
const fs = require("fs")
const fsp = fs.promises
const { escapeAttribute } = require("entities/lib/escape.js")


function isValidHttpUrl(string) {
	let url
	try {
		url = new URL(string)
	} catch (_) {
		return false
	}
}
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

	isReply(tweet) {
		return !!tweet.in_reply_to_status_id
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
		if (displayUrl.startsWith(`https://twitter.com/${metadata.username}/status/`)) {
			targetUrl = `/${expandedUrl.substr(`https://twitter.com/${metadata.username}/status/`.length)}`
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
		let imgRef = stats.jpeg[0]
		return `<a href="${imgRef.url}"><img src="${imgRef.url}" width="${imgRef.width}" height="${imgRef.height}" alt="${escapeAttribute(alt) || "oh my god twitter doesn’t include alt text from images in their API"}" class="tweet-media u-featured" onerror="fallbackMedia(this)" loading="lazy" decoding="async"></a>`
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

		// linkify urls
		if (tweet.entities) {
			for (let url of tweet.entities.urls) {
				// Remove photo URLs
				if (url.expanded_url && url.expanded_url.indexOf(`/${tweet.id}/photo/`) > -1) {
					textReplacements.set(url.url, { html: "" })
				} else {
					let { targetUrl, className, displayUrl } = this.getUrlObject(url)
					targetUrl = twitterLink(targetUrl)

					textReplacements.set(url.url, { html: `<a href="${targetUrl}" class="${className}" data-pagefind-index-attrs="href">${displayUrl}</a>` })

					// Add opengraph preview
					if (targetUrl.startsWith("https://") && !targetUrl.startsWith("https://twitter.com/")) {
						medias.push(`<template data-island><a href="${targetUrl}"><img src="https://v1.opengraph.11ty.dev/${encodeURIComponent(targetUrl)}/small/onerror/" alt="OpenGraph image for ${displayUrl}" loading="lazy" decoding="async" width="375" height="197" class="tweet-media tweet-media-og" onerror="this.parentNode.remove()"></a></template>`)
					}
				}
			}

			for (let mention of tweet.entities.user_mentions) {
				textReplacements.set(mention.screen_name, {
					regex: new RegExp(`@${mention.screen_name}`, "i"),
					html: `<a href="${twitterLink(`https://twitter.com/${mention.screen_name}/`)}" class="tweet-username h-card">@<span class="p-nickname">${mention.screen_name}</span></a>`,
				})
			}
		}

		if (tweet.extended_entities) {
			for (let media of tweet.extended_entities.media) {
				if (media.type === "photo") {
					// remove photo URL
					textReplacements.set(media.url, { html: "" })

					try {
						let html = await this.getImage(media.media_url_https, media.alt_text || "")
						medias.push(html)
					} catch (e) {
						console.log("Image request error", e.message)
						medias.push(`<a href="${media.media_url_https}">${media.media_url_https}</a>`)
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
							medias.push(`<video muted controls ${media.type === "animated_gif" ? "loop" : ""} src="${videoUrl}" poster="${imgRef.url}" class="tweet-media u-video"></video>`)
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



	/*async renderTweet(tweet, options = {}) {
		if( !tweet ) {
			return "";
		}

		let {transform: twitterLink} = await import("@tweetback/canonical");
		let sentimentValue = this.getSentiment(tweet);

		let shareCount = parseInt(tweet.retweet_count, 10) + (tweet.quote_count ? tweet.quote_count : 0);

	return `<li id="${tweet.id_str}" class="tweet h-entry${options.class ? ` ${options.class}` : ""}${this.isReply(tweet) && tweet.in_reply_to_screen_name !== metadata.username ? " is_reply " : ""}${this.isRetweet(tweet) ? " is_retweet" : ""}${this.isMention(tweet) ? " is_mention" : ""}" data-pagefind-index-attrs="id">
		${this.isReply(tweet) ? `<a href="${tweet.in_reply_to_screen_name !== metadata.username ? twitterLink(`https://twitter.com/${tweet.in_reply_to_screen_name}/status/${tweet.in_reply_to_status_id_str}`) : `/${tweet.in_reply_to_status_id_str}/`}" class="tweet-pretext u-in-reply-to">…in reply to @${tweet.in_reply_to_screen_name}</a>` : ""}
			<div class="tweet-text e-content"${options.attributes || ""}>${await this.renderFullText(tweet, options)}</div>
			<span class="tweet-metadata">
				${!options.hidePermalink ? `<a href="/${tweet.id_str}/" class="tag tag-naked">Permalink</a>` : ""}
				<a href="https://twitter.com/${metadata.username}/status/${tweet.id_str}" class="tag tag-icon u-url" data-pagefind-index-attrs="href"><span class="sr-only">On twitter.com </span><img src="${this.avatarUrl("https://twitter.com/")}" alt="Twitter logo" width="27" height="27"></a>
				${!this.isReply(tweet) ? (this.isRetweet(tweet) ? `<span class="tag tag-retweet">Retweet</span>` : (this.isMention(tweet) ? `<span class="tag">Mention</span>` : "")) : ""}
				${!this.isRetweet(tweet) ? `<a href="/" class="tag tag-naked tag-lite tag-avatar"><img src="${metadata.avatar}" width="52" height="52" alt="${metadata.username}’s avatar" class="tweet-avatar"></a>` : ""}
				${options.showPopularity && !this.isRetweet(tweet) ? `
					${shareCount > 0 ? `<span class="tag tag-lite tag-retweet">♻️ ${this.renderNumber(shareCount)}<span class="sr-only"> Retweet${shareCount !== "1" ? "s" : ""}</span></span>` : ""}
					${tweet.favorite_count > 0 ? `<span class="tag tag-lite tag-favorite">❤️ ${this.renderNumber(tweet.favorite_count)}<span class="sr-only"> Favorite${tweet.favorite_count !== "1" ? "s" : ""}</span></span>` : ""}
				`.trim() : ""}
				${tweet.date ? `<time class="tag tag-naked tag-lite dt-published" datetime="${tweet.date.toISOString()}">${this.renderDate(tweet.date)}</time>` : ""}
				${!this.isRetweet(tweet) ?
					`<span class="tag tag-naked tag-lite${!options.showSentiment || sentimentValue === 0 ? " sr-only" : ""}">Mood ` +
						(sentimentValue > 0 ? "+" : "") +
						`<strong class="tweet-sentiment">${sentimentValue}</strong>` +
						(sentimentValue > 0 ? " 🙂" : (sentimentValue < 0 ? " 🙁" : "")) +
					"</span>" : ""}
			</span>
		</li>`;

		// source ? `<span class="tag tag-naked tag-lite">${source}</span>` : ""
	}*/

	async replaceQuotingTweetByQuotedTweet(replyTweet) {
		const quoted_tweet_ID = replyTweet.entities.url[0].expanded_url.match(/Saint_loup\/status\/(\d*$)/)[1]
		return (await dataSource.getRepliesToId(quoted_tweet_ID)) || []
	}

	async getReplies(tweet, direction = "next") {
		if (direction === "next") {
			return (await dataSource.getRepliesToId(tweet.id_str)) || []
		} else {
			let replyTweet = await dataSource.getTweetById(tweet && tweet.in_reply_to_status_id_str)
			if (isValidHttpUrl(replyTweet.full_text)) {
				replyTweet = this.replaceQuotingTweetByQuotedTweet(replyTweet)
			}

			return replyTweet ? [replyTweet] : []
		}
	}

	async getReplyHtml(tweet, direction = "next", tweetOptions = {}) {
		let replies = await this.getReplies(tweet, direction)
		if (!replies.length) {
			return ""
		}

		let repliesHtml = []
		for (let replyTweet of replies) {
			let tweetHtml = await this.renderTweet(replyTweet, Object.assign({ class: `tweet-${direction}` }, tweetOptions))
			let previousHtml = direction === "previous" ? await this.getReplyHtml(replyTweet, direction, tweetOptions) : ""
			let nextHtml = direction === "next" ? await this.getReplyHtml(replyTweet, direction, tweetOptions) : ""

			repliesHtml.push((previousHtml ? `<ol class="tweets-replies">${previousHtml}</ol>` : "") +
				tweetHtml +
				(nextHtml ? `<ol class="tweets-replies">${nextHtml}</ol>` : ""))
		}

		return repliesHtml.join("")
	}

	async renderTweetThread(tweet, tweetOptions = {}) {
		let previousAndNextTweetOptions = Object.assign({}, tweetOptions, { hidePermalink: false })
		let previousHtml = await this.getReplyHtml(tweet, "previous", previousAndNextTweetOptions)
		let nextHtml = await this.getReplyHtml(tweet, "next", previousAndNextTweetOptions)

		tweetOptions.attributes = " data-pagefind-body"

		return `<ol class="tweets tweets-thread h-feed hfeed" data-pagefind-body>
			${previousHtml ? `<ol class="tweets-replies h-feed hfeed">${previousHtml}</ol>` : ""}
			${await this.renderTweet(tweet, tweetOptions)}
			${nextHtml ? `<ol class="tweets-replies h-feed hfeed">${nextHtml}</ol>` : ""}
		</ol>`
	}

}
module.exports = Twitter
