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
import { checkInDatabase, tweetCount, saveToDatabaseApiV1, tableExists } from './tweet-to-db'

export async function importFromArchive() {
	try {

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
					from: 'window.YTD.tweets.part0 = [',
					to: '[',
				})
			}
		}

		await JSONify("data", "tweets")



		const path = './data/manifest.js'
		if (await exists(path)) {
			const manifest = require(join(process.cwd(), path))
			var archiveTweetCount = manifest.window['__THAR_CONFIG'].tweets[0].files.count
		}
		const dbTweetCount = await tweetCount() as number

		// edited tweets will inflate the count, so we add a arbitrary number to compensate.
		const areTweetsMissing = (archiveTweetCount > dbTweetCount + 100)
		if (!(await tableExists('tweets')) || areTweetsMissing) {
			await db.run("CREATE TABLE IF NOT EXISTS tweets (id_str TEXT PRIMARY KEY ASC, created_at TEXT, in_reply_to_status_id_str TEXT, in_reply_to_screen_name TEXT, full_text TEXT, json TEXT, api_version TEXT, hidden INTEGER)")
			const tweets = chain(
				[fs.createReadStream(destinationFile),
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
			return tweets.on('finish', () => console.log(tweetCount))
		} else {
			info("table alreay exist")

			return (new Writable()).end()
		}


	} catch (e) {
		console.log("ERROR", e)
	}
}