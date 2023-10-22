// INITIAL CREDIT: https://github.com/tweetback/tweetback/
import * as sqlite3 from 'sqlite3'
var db = new sqlite3.Database("./tweet.db")
sqlite3.verbose()

import getDateString from "./getDateString"
import { Tweet } from '../types'
import util from 'util'

//@ts-ignore
db.all = util.promisify(db.all)
db.serialize = util.promisify(db.serialize)
//@ts-ignore
db.run = util.promisify(db.run)
//@ts-ignore
db.each = util.promisify(db.each)

export async function createTable() {
  return await db.run("CREATE TABLE IF NOT EXISTS tweets (id_str TEXT PRIMARY KEY ASC, created_at TEXT, in_reply_to_status_id_str TEXT, in_reply_to_screen_name TEXT, full_text TEXT, json TEXT, api_version TEXT, hidden INTEGER)")
}

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


export async function saveToDatabase(tweet): Promise<sqlite3.Database> {
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


export async function tweetCount(): Promise<Error | number> {
  //@ts-ignore
  const { err, count } = await db.each("SELECT COUNT(*) AS count FROM tweets")
  if (err) {
    console.log(err)
  }
  if (count) {
    return count
  }
}

