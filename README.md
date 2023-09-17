# Tweet-To-Toot – repost your Twitter threads to Mastodon

## VERY MUCH UNFINISHED. NOT EVEN PRE-ALPHA. IT'S A SORRY MESS. WHY IS THIS EVEN PUBLIC.

You want to break free of X/Twitter but do not want to lose your numerous, ongoing, carefully maintained, years-long threads?

This tool is for your: grab an archive of your Twitter account, republish the threads your want on Mastodon and start anew.

Under the hood is a stripped-down fork of [Tweetback](https://github.com/tweetback/tweetback) and [a client](https://github.com/neet/masto.js/) using the Mastodon API.

## Setup

- Clone/download this repository
- In your terminal, cd to the folder of the project
- Install Node.js
- Run npm install
- Copy `./data/tweets.js` from your Twitter Archive zip file into the `./database` directory of this project.
- Rename `window.YTD.tweet.part0` in `tweets.js` to `module.exports`
- Run `npm run create-db`

The `create-db` should be a bit long with big archives.


## Usage

Examples :

- `npm run publish -- --ids=1157670494390378498 --intro="imported thread, started in 2019 on the Other Site" --mergeQuote=no`

- `npm run publish -- --ids=1157670494390378498,1157670494390378498`


## Parameters

`--ids`: One or several IDs of twitter posts. These ID can be found at the end of their URL, after "status/". This tool will use these as a starting poing and find more recent replies in your archive. So typically, choose the oldest post in your thread.

`--intro`: Short text in quotes. Optional. Append dedicated post at the beginning of your Mastodon Thread

`--mergeQuote`: yes or no. Default : no. Defines behavior for quoted tweets of yourself. If false, it will keep the quote as a link to Twitter.com. If true, it will merge the content of the quote with the post.

`--concatWith`: Mastodon post id. Optional. If provided, the thread will be posted as a continuation of this post. Useful if you want merge threads.

`--wait`: Number of seconds. Waiting period between each posting to Mastodon. Default : half a second.

### Warnings

- Quoted

### Publishing

