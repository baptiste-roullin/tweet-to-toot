import * as sqlite from 'sqlite3'
import { Tweet } from './types'
const sqlite3 = sqlite.verbose()

let db = {}
if (process.env.NODE_ENV === "dev") {
	db = new sqlite3.Database("./database/test.db")
}
else {
	db = new sqlite3.Database("./database/tweet.db")
}


export default class DataSource {

	constructor() {
		this.cache = {
			replies: {},

		}
	}

	cache: Record<string, any>
	cachedGetAllPromise: Promise<Tweet[]>


	async getRepliesToId(id: string): Promise<Tweet[] | []> {
		if (!id) {
			return []
		}

		// populate cache if it hasn’t yet.
		if (!this.cache.all) {
			await this.getAllTweets()
		}

		// full table scans for this was way too expensive, so we cache
		return this.cache.replies[id] ? Array.from(this.cache.replies[id]) : []
	}

	async getTweetById(id): Promise<Tweet | null> {
		if (!id) {
			return null
		}

		return new Promise((resolve, reject) => {
			db.get("SELECT * FROM tweets WHERE id_str = ?", { 1: id }, (err, row) => {
				if (err) {
					reject(err)
				} else {
					resolve(row ? this.normalizeTweetObject(row) : null)
				}
			})
		})
	}

	// takes a db row, returns the tweet json
	normalizeTweetObject(tweet): Tweet {
		let json = JSON.parse(tweet.json)
		if (tweet.api_version === "2") {

			let replies: Record<string, any>[] = (json.referenced_tweets || []).filter(entry => entry.type === "replied_to")
			let replyTweetId = replies.length ? replies[0].id : null

			let obj = {
				date: new Date(Date.parse(json.created_at)),
				id: json.id,
				id_str: json.id,
				// should always be a string
				full_text: json.text || "",
				lang: json.lang || "",
				truncated: false,
				retweet_count: json.public_metrics.retweet_count,
				favorite_count: json.public_metrics.like_count,
				quote_count: json.public_metrics.quote_count,
				reply_count: json.public_metrics.reply_count,
				in_reply_to_status_id: replyTweetId,
				in_reply_to_status_id_str: replyTweetId,
				in_reply_to_user_id: json.in_reply_to_user_id,
				in_reply_to_user_id_str: json.in_reply_to_user_id,
				in_reply_to_screen_name: tweet.in_reply_to_screen_name, // use the db row instead of the json,
				entities: json.entities || {},
				extended_entities: {}
			}
			if (json.entities && json.entities.urls) {
				obj.entities.urls = json.entities.urls
			} else {
				obj.entities.urls = []
			}

			if (json.entities && json.entities.mentions) {
				obj.entities.user_mentions = json.entities.mentions.map(entry => {
					entry.screen_name = entry.username
					return entry
				})
			} else {
				obj.entities.user_mentions = []
			}

			// Normalized before inserted in to the DB (see tweet-to-db.js)
			obj.extended_entities = json.extended_entities

			return obj
		}

		json.date = new Date(json.created_at)
		// should always be a string
		json.entities = json.entities || {}
		json.entities.urls = json.entities.urls || []
		json.entities.user_mentions = json.entities.user_mentions || []
		json.full_text = json.full_text || ""
		return json
	}

	async getAllTweets(): Promise<Tweet[]> {
		if (this.cache.all) {
			return this.cache.all
		}
		if (this.cachedGetAllPromise) {
			return this.cachedGetAllPromise
		}

		// This should only run once.
		this.cachedGetAllPromise = new Promise((resolve, reject) => {
			db.all("SELECT * FROM tweets", (err, rows) => {
				if (err) {
					reject(err)
				} else {
					let ret = rows.filter(row => {
						if (row['hidden']) {
							return false
						}
						return true
					}).map(row => {
						let json = this.normalizeTweetObject(row)
						if (json.in_reply_to_status_id_str) {
							if (!this.cache.replies[json.in_reply_to_status_id_str]) {
								this.cache.replies[json.in_reply_to_status_id_str] = new Set()
							}
							this.cache.replies[json.in_reply_to_status_id_str].add(json)
						}
						return json
					})
					this.cache.all = ret
					resolve(ret)
				}
			})
		})

		return this.cachedGetAllPromise
	}
}

