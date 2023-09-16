const dataSource = require("./DataSource.js")
const Twitter = require('./twitter.js')

async function mastoThread(id) {
	const twitter = new Twitter()
	const firstTweet = await dataSource.getTweetById(id)
	const tweets = await twitter.getReplies(firstTweet)
	console.log(tweets)
}

mastoThread('1322709000010477569')