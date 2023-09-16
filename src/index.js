const dataSource = require("./DataSource.js")
const fsp = require("node:fs/promises")

const Twitter = require('./twitter.js');




(async function () {

	async function mastoThread(id) {
		const twitter = new Twitter()
		const firstTweet = await dataSource.getTweetById(id)
		return await twitter.generateThread(firstTweet)
	}

	const args = process.argv[2].split(',')

	const threads = await Promise.all(args.map(id => mastoThread(id)))
	await fsp.writeFile('threads.json', JSON.stringify(threads))


})()