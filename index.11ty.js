const metadata = require("./_data/metadata.js")
const Twitter = require("./src/twitter")

class Index extends Twitter {
	data() {
		return {
			layout: "layout.11ty.js"
		}
	}


	getAllLinks(tweets = []) {
		let links = []
		for (let tweet of tweets) {
			let tweetLinks = this.getLinkUrls(tweet)
			for (let link of tweetLinks) {
				links.push(link)
			}
		}
		return links
	}

	/*

		async render(data) {
			let { transform: twitterLink } = await import("@tweetback/canonical")

			let tweets = await dataSource.getAllTweets()
			let last12MonthsTweets = tweets.filter(tweet => tweet.date - new Date(Date.now() - 1000 * 60 * 60 * 24 * 365) > 0)

			let tweetCount = tweets.length
			let retweetCount = tweets.filter(tweet => this.isRetweet(tweet)).length
			let noRetweetsTweetCount = tweets.length - retweetCount
			let replyCount = tweets.filter(tweet => this.isReply(tweet)).length
			let mentionNotReplyCount = tweets.filter(tweet => this.isMention(tweet)).length
			// let ambiguousReplyMentionCount = tweets.filter(tweet => this.isAmbiguousReplyMention(tweet)).length;
			let retweetsEarnedCount = tweets.filter(tweet => !this.isRetweet(tweet)).reduce((accumulator, tweet) => accumulator + parseInt(tweet.retweet_count, 10), 0)
			let likesEarnedCount = tweets.filter(tweet => !this.isRetweet(tweet)).reduce((accumulator, tweet) => accumulator + parseInt(tweet.favorite_count, 10), 0)

			let topSwears = this.getTopSwearWords(tweets)
			let swearCount = topSwears.reduce((accumulator, obj) => accumulator + obj.count, 0)
			let tweetSwearCount = topSwears.reduce((accumulator, obj) => accumulator + obj.tweets.length, 0)

			let topHashes = this.getTopHashTags(tweets)
			let hashCount = topHashes.reduce((accumulator, obj) => accumulator + obj.count, 0)
			let tweetHashCount = topHashes.reduce((accumulator, obj) => accumulator + obj.tweets.length, 0)

			const emoji = new EmojiAggregator()
			for (let tweet of tweets) {
				if (!this.isRetweet(tweet)) {
					emoji.add(tweet)
				}
			}
			let emojis = emoji.getSorted()
			let mostRecentTweets = tweets.filter(tweet => this.isOriginalPost(tweet)).sort(function (a, b) {
				return b.date - a.date
			}).slice(0, 15)
			let recentTweetsHtml = await Promise.all(mostRecentTweets.map(tweet => this.renderTweet(tweet)))
			let mostPopularTweetsHtml = await Promise.all(this.getMostPopularTweets(tweets).slice(0, 6).map(tweet => this.renderTweet(tweet, { showPopularity: true })))

			let links = this.getAllLinks(tweets)
			let linksCount = links.length
			let httpsLinksCount = links.filter(entry => entry.origin.startsWith("https:")).length

			let links12Months = this.getAllLinks(last12MonthsTweets)
			let linksCount12Months = links12Months.length
			let httpsLinksCount12Months = links12Months.filter(entry => entry.origin.startsWith("https:")).length
			return `
			<h2 class="tweets-primary-count">
				<span class="tweets-primary-count-num">${this.renderNumber(tweetCount)}</span> tweet${tweetCount !== 1 ? "s" : ""}
			</h2>

			<is-land on:visible on:save-data="false">
				<template data-island>
					<h2>Search Tweets:</h2>
					<div class="tweets-search">
						<div id="search" class="tweets-search"></div>
						<link href="/_pagefind/pagefind-ui.css" rel="stylesheet">
						<script src="/_pagefind/pagefind-ui.js" onload="new PagefindUI({ element: '#search', showImages: false });"></script>
					</div>
				</template>
			</is-land>

			<div>
				<h2><a href="/recent/">Recent:</a></h2>

				<ol class="tweets tweets-linear-list h-feed hfeed" id="tweets-recent-home">
					${recentTweetsHtml.join("")}
				</ol>
			</div>

			<div>
				<h2><a href="/popular/">Popular:</a></h2>
				<ol class="tweets tweets-linear-list">
					${mostPopularTweetsHtml.join("")}
				</ol>
			</div>

			<h2 id="retweets">I’ve retweeted other tweets ${this.renderNumber(retweetCount)} times (${this.renderPercentage(retweetCount, tweetCount)})</h2>
			<div class="lo" style="--lo-stackpoint: 20em">
				<div class="lo-c">
					<h3>Most Retweeted</h3>
					<ol>
						${this.getTopUsersToRetweets(tweets).slice(0, 10).map(user => `<li><a href="${twitterLink(`https://twitter.com/${user.username}`)}">${user.username}</a> ${user.count} retweet${user.count != 1 ? "s" : ""}</li>`).join("")}
					</ol>
				</div>
				<div class="lo-c">
					<h3>Most Retweeted (Last 12 months)</h3>
					<ol>
						${this.getTopUsersToRetweets(last12MonthsTweets).slice(0, 10).map(user => `<li><a href="${twitterLink(`https://twitter.com/${user.username}`)}">${user.username}</a> ${user.count} retweet${user.count != 1 ? "s" : ""}</li>`).join("")}
					</ol>
				</div>
			</div>

			<h2 id="replies">Replies and Mentions</h2>
			<h3>${this.renderPercentage(replyCount, tweetCount)} of my tweets are replies (×${this.renderNumber(replyCount)})</h3>
			<div class="lo" style="--lo-stackpoint: 20em">
				<div class="lo-c">
					<h4>Most Replies To</h4>
					<ol>
						${this.getTopReplies(tweets).slice(0, 5).map(user => `<li><a href="${twitterLink(`https://twitter.com/${user.username}`)}">${user.username}</a> ${user.count} repl${user.count != 1 ? "ies" : "y"}</li>`).join("")}
					</ol>
				</div>
				<div class="lo-c">
					<h4>Most Replies To (Last 12 months)</h4>
					<ol>
						${this.getTopReplies(last12MonthsTweets).slice(0, 5).map(user => `<li><a href="${twitterLink(`https://twitter.com/${user.username}`)}">${user.username}</a> ${user.count} repl${user.count != 1 ? "ies" : "y"}</li>`).join("")}
					</ol>
				</div>
			</div>
			<h3>I’ve sent someone a mention ${this.renderNumber(mentionNotReplyCount)} times (${this.renderPercentage(mentionNotReplyCount, tweetCount)})</h3>

			<h2 id="links">Most Frequent Sites I’ve Linked To</h2>
			<h3>${this.renderPercentage(httpsLinksCount, linksCount)} of the links I’ve posted are using the <code>https:</code> protocol  (${this.renderNumber(httpsLinksCount)} of ${this.renderNumber(linksCount)})</h3>
			<h3>${this.renderPercentage(httpsLinksCount12Months, linksCount12Months)} of the links I’ve posted in the last 12 months are using the <code>https:</code> protocol  (${this.renderNumber(httpsLinksCount12Months)} of ${this.renderNumber(linksCount12Months)})</h3>

			<div class="lo" style="--lo-stackpoint: 20em">
				<div class="lo-c">
					<h4>Top Domains</h4>
					<ol>
						${this.getTopDomains(tweets).slice(0, 10).map(entry => `<li><a href="https://${entry.domain}">${entry.domain}</a> ${entry.count} tweets</li>`).join("")}
					</ol>
				</div>
				<div class="lo-c">
					<h4>Top Hosts</h4>
					<ol>
						${this.getTopHosts(tweets).slice(0, 10).map(entry => `<li><a href="https://${entry.host}">${entry.host}</a> ${entry.count} tweets</li>`).join("")}
					</ol>
				</div>
			</div>

			<h2 id="shared">My tweets have been given about <span class="tag tag-lite tag-retweet">♻️ ${this.renderNumber(retweetsEarnedCount)}</span> retweets and <span class="tag tag-lite tag-favorite">❤️ ${this.renderNumber(likesEarnedCount)}</span> likes</h2>

			<h2 id="emoji">Top 5 Emoji Used in Tweets</h2>
			<ol>
				${emojis.slice(0, 5).map(obj => `<li>${obj.glyph} used ${obj.count} times on ${obj.tweetcount} tweets</li>`).join("")}
			</ol>
			<p><em>${this.renderNumber(emojis.length)} unique emoji on ${this.renderNumber(emoji.getTweetCount())} tweets (${this.renderPercentage(emoji.getTweetCount(), noRetweetsTweetCount)} of all tweets***)</em></p>
			<h2 id="hashtags">Top 5 Hashtags</h2>
			<ol>
				${topHashes.slice(0, 5).map(hash => `<li><code>${hash.tag}</code> used ${hash.count} times ${hash.count > 1 && hash.count > hash.tweets.length ? `on ${hash.tweets.length} tweet${hash.tweets.length !== 1 ? "s" : ""}` : ""}</li>`).join("")}
			</ol>
			<p><em>${this.renderNumber(hashCount)} hashtags on ${this.renderNumber(tweetHashCount)} tweets (${this.renderPercentage(tweetHashCount, noRetweetsTweetCount)} of all tweets***)</em></p>
			<h2 id="swears">Top 5 Swear Words</h2>
			<ol>
				${topSwears.slice(0, 5).map(swear => `<li><code>${this.renderSwearWord(swear.word)}</code> used ${swear.count} times ${swear.count > 1 && swear.count > swear.tweets.length ? `on ${swear.tweets.length} tweet${swear.tweets.length !== 1 ? "s" : ""}` : ""}</li>`).join("")}
			</ol>
			<p><em>${this.renderNumber(swearCount)} swear words on ${this.renderNumber(tweetSwearCount)} tweets (${this.renderPercentage(tweetSwearCount, noRetweetsTweetCount)} of all tweets***)</em></p>
			<p>***: does not include retweets</p>

			<template id="rendered-twitter-link"><a href="/1234567890123456789/">twitter link</a></template>
	`
			// <h3>Before 2012, it was not possible to tell the difference between a mention and reply. This happened ${this.renderNumber(ambiguousReplyMentionCount)} times (${this.renderPercentage(ambiguousReplyMentionCount, tweetCount)})</h3>

			// <h3>I’ve sent someone a mention ${this.renderNumber(mentionNotReplyCount)} times (${this.renderPercentage(mentionNotReplyCount, tweetCount)})</h3>
			// <p>Mentions are tweets sent to a single person but not as a reply to an existing tweet. Note that this number is overinflated for old data—Twitter didn’t support official replies before July 2012.</p>
		}*/
}

module.exports = Index
