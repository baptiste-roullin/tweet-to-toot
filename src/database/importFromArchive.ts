import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { Writable } from 'node:stream'
import { join, normalize } from 'node:path'

import { replaceInFile } from 'replace-in-file'
import { streamArray } from 'stream-json/streamers/StreamArray'
import { parser } from 'stream-json/parser'
import { chain } from 'stream-chain'

import * as sqlite3 from 'sqlite3'
var db = new sqlite3.Database("./tweet.db")
sqlite3.verbose()

import { exists, info } from '../utils'
import { checkInDatabase, createTable, tweetCount, saveToDatabaseApiV1, tableExists } from './tweet-to-db'

export async function importFromArchive() {

	// transform a JS with a window global object into a JSON file.
	//name : name of the file, without extension
	async function JSONify(path, name) {
		const folder = join(process.cwd(), path)
		const destinationFile = join(folder, name + '.json')
		if (await exists(destinationFile)) {
			info('JSON file already exists')
		}
		else {
			await fsp.copyFile(join(folder, name + '.js'), destinationFile)
			await replaceInFile({
				files: normalize(destinationFile),
				from: /^window\..*\s=\s(\[|\{)/,
				to: '$1',
				// Disabling glob, otherwise Windows backward slashes messes the path because of the glob package.
				disableGlobs: true,
			})
		}
	}

	async function areTweetsMissing() {
		await JSONify("data", "manifest")
		const path = './data/manifest.js'
		if (await exists(path)) {
			const manifest = require(join(process.cwd(), "./data/manifest.json"))
			var archiveTweetCount = manifest.dataTypes.tweets.files[0].count
		}
		const dbTweetCount = await tweetCount() as number

		// Potential edited tweets will inflate the count, so we add a arbitrary number to compensate.
		// This is a rough check anyway. The import process failing halfway, with thousands of tweets missing, is more likely than one or tweets missing.
		//TODO : cleaner solution
		return (archiveTweetCount >= dbTweetCount + 100)
	}

	try {
		await JSONify("data", "tweets")

		if (!(await tableExists('tweets'))) {
			await createTable()
		} else {
			info("table alreay exist")

		}
		if (await areTweetsMissing()) {
			const tweets = chain(
				[fs.createReadStream('./data/tweets.json'),
				parser(),
				streamArray(),
				async function (item) {
					let existingRecordsFound = 0
					let missingTweets = 0
					let { tweet } = item['value']

					const record = await checkInDatabase(tweet)
					if (record === false) {
						existingRecordsFound++
					} else {
						missingTweets++
						await saveToDatabaseApiV1(tweet)
						//console.log({ existingRecordsFound, missingTweets })
					}
				}]
			)
			return tweets
		}
		else {
			info('no tweets missing')
			return (new Writable()).end()

		}

	} catch (e) {
		console.log("ERROR", e)
	}
}