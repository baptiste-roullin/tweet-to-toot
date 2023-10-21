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
import { checkInDatabase, createTable, logTweetCount, saveToDatabaseApiV1, tableExists } from './tweet-to-db'

export async function importFromArchive() {
	try {


		const folder = join(process.cwd(), "data")
		const destinationFile = join(folder, 'tweets.json')
		if (await exists(destinationFile)) {
			console.log('JSON file already exists')
		}
		else {
			await fsp.copyFile(join(folder, 'tweets.js'), destinationFile)
			console.log(await exists(join(folder, 'tweets.json')))

			const replace = await replaceInFile({
				files: join(folder, 'tweets.json'),
				from: 'window.YTD.tweets.part0 = [',
				to: '[',
				// Disabling glob, otherwise backward slashes messes the path because of the glob package.
				disableGlobs: true,
			})

		}

		if (!(await tableExists('tweets'))) {
			await createTable()
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
			logTweetCount() //TODO : exécute trop.
			return tweets
		} else {
			console.log("table alreay exist")
			//logTweetCount()
			return (new Writable()).end()
		}
	} catch (e) {
		console.log("ERROR", e)
	}
}