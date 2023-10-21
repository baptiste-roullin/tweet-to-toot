// CREDIT: https://github.com/tweetback/tweetback/
import util from 'util'

import * as sqlite3 from 'sqlite3'
var db = new sqlite3.Database("./tweet.db")
sqlite3.verbose()

import getDateString from "./getDateString"
import { Tweet } from '../types'

//@ts-ignore
db.all = util.promisify(db.all)
db.serialize = util.promisify(db.serialize)
//@ts-ignore
db.run = util.promisify(db.run)


export async function tableExists(test) {
  const tables = await db.all("select name from sqlite_master where type='table'") as unknown as Array<Record<string, any>>
  const check = tables.some(table => table.name === test)
  return check
}

// if the tweet does not exist in the DB, resolves a promise with the tweet ID
export async function checkInDatabase(tweet): Promise<Tweet | boolean> {
  return new Promise(function (resolve, reject) {
    db.get("SELECT * FROM tweets WHERE id_str = ?", { 1: tweet.id }, function (err, row) {
      if (err) {
        reject(`Error on .get() ${err}`)
      } else if (row) {
        resolve(false)
      } else {
        resolve(tweet)
      }
    })
  })
}


export async function saveToDatabaseApiV1(tweet) {
  const API_VERSION = 1
  return new Promise(function (resolve, reject) {
    db.parallelize(function () {
      let stmt = db.prepare("INSERT OR IGNORE INTO tweets VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      stmt.run(
        tweet.id_str, getDateString(tweet.created_at), tweet.in_reply_to_status_id_str, tweet.in_reply_to_screen_name, tweet.full_text, JSON.stringify(tweet), API_VERSION, "",
        function (err) {
          if (err) {
            stmt.finalize()
            reject(`Error on .run() ${err}`)
          } else {
            stmt.finalize()
            resolve(this.changes)
          }
        })

    })
  })
}

export function saveToDatabase(tweet, users, mediaObjects) {
  const API_VERSION = 2

  let replies = (tweet.referenced_tweets || []).filter(entry => entry.type === "replied_to")
  let replyTweetId = replies.length ? replies[0].id : null

  let userEntry = users.filter(entry => entry.id === tweet.in_reply_to_user_id)
  let replyScreenName = userEntry.length ? userEntry[0].username : null

  // We need to normalize the mediaObjects into each row, the Twitter API has them separated out
  if (tweet.attachments && tweet.attachments.media_keys) {
    tweet.extended_entities = {
      media: []
    }

    for (let key of tweet.attachments.media_keys) {
      let [media] = mediaObjects.filter(entry => entry.media_key === key)
      if (media) {
        // aliases for v1
        if (media.type === "video") { // video
          media.media_url_https = media.preview_image_url
          media.video_info = {
            variants: [
              {
                url: media.url
              }
            ]
          }
        } else {
          media.media_url_https = media.url
        }

        tweet.extended_entities.media.push(media)
      } else {
        throw new Error(`Media object not found for media key ${key} on tweet ${tweet.id}`)
      }
    }
  }

  let stmt = db.prepare("INSERT INTO tweets VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
  stmt.run(tweet.id, getDateString(tweet.created_at), replyTweetId, replyScreenName, tweet.text, JSON.stringify(tweet), API_VERSION, "")
  stmt.finalize()
}

export function logTweetCount() {

  db.each("SELECT COUNT(*) AS count FROM tweets", function (err, row) {
    console.log("Finished count", row['count'])

  })
}

