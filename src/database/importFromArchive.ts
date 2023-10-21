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

import { exists } from '../utils'
import { checkInDatabase, logTweetCount, saveToDatabaseApiV1, tableExists } from './tweet-to-db'

export async function importFromArchive() {
	try {

		//glob package need forward path
		//const cwd = process.cwd().replace(/\\/g, '/')

		const folder = join(process.cwd(), "data")
		const destinationFile = join(folder, 'tweets.json')
		if (await exists(destinationFile)) {
			console.log('JSON file already exists')
		}
		else {
			await fsp.copyFile(join(folder, 'tweets.js'), destinationFile)
			console.log(await exists(join(folder, 'tweets.json')))

			const replace = await replaceInFile({
				files: normalize(join(folder, 'tweets.json')),
				from: 'window.YTD.tweet.part0 = [',
				to: '[',
				disableGlobs: true,
			})
			console.log(replace)

		}

		if (!(await tableExists('tweets'))) {
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
						//console.log(tweet.id_str)
						await saveToDatabaseApiV1(tweet)
						//console.log({ existingRecordsFound, missingTweets })
					}

				}]
			)
			logTweetCount()
			return tweets
		} else {
			console.log("table alreay exist")
			logTweetCount()
			return (new Writable()).end()
		}


	} catch (e) {
		console.log("ERROR", e)
	}
}