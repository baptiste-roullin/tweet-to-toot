# Tweet To Toot – export your Twitter threads to Mastodon

⚠️ ⚠️ ⚠️ **THIS IS A BETA VERSION, USE AT YOUR OWN RISK** ⚠️ ⚠️ ⚠️

You want to break free of the site formerly known as Twitter but do not want to lose your numerous, ongoing, carefully maintained, years-long threads?

This tool is for your: [grab an archive](https://twitter.com/settings/download_your_data) of your Twitter account, republish the threads your want on Mastodon and start anew.

Under the hood is a heavy fork of [Tweetback](https://github.com/tweetback/tweetback) and [a client](https://github.com/neet/masto.js/) for the Mastodon API.

## Required

Node v18 or 19. NVM advised if it's not your typical Node environnment.

## Setup

- Clone or download this repository
- In your terminal, go to the folder of the project
- Run npm install
- Copy `./data/tweets.js` from your Twitter archive zip file into the `./database` directory of this project.
- Rename `window.YTD.tweet.part0` in `tweets.js` to `module.exports`
- Run `npm run create-db`
- Grab a Mastodon API token by following [these instructions](https://neet.github.io/masto.js/#md:quick-start).
- Add the token and the URL or you instance as environnment variables, for instance in a file named .env at the root of your project.

## Usage

Examples:

- `npm run publish -- --ids 1157670494390378498 --intro="imported thread, started in 2019 on the Other Site" --dry-run`

- `npm run publish -- --ids 1157670494390378498 1157670494390378498`


## Parameters

`--ids`: One or several IDs of twitter messages. These ID can be found at the end of their URL, after "status/". The tool will use these as a starting poing and find more recent replies in your archive. So choose the oldest message in your thread.

`--intro`: Short text in quotes. Optional. Append a message at the beginning of your Mastodon thread.

`--wait`: Number of seconds. Waiting period between each request to Mastodon. Default : half a second.

`--dry-run`: Show thread without publishing it.

`--merge`:  Default to false. Defines behavior for quoted tweets of yourself. If false, it will keep the quote as a link to Twitter.com. If true, it will merge the quoting and the quoted message. The URL to the quoted message is preserved.


### To do

* `--concatWith`: Mastodon message id. Optional. If provided, the thread will be messageed as a continuation of this message. Useful if you want merge threads.
* Handling of branching threads.

## Caveats

- Twitter can show threads with deleted messages in the middle. This tool can't. Workaround: Use it twice and the second time specifiy a `concatWith` option.
- Use `wait` generously. Because Mastodon default rate limits can be quickly reached with media. And of course because of general respect to instance maintainers.
- As Mastodon doesn't officially support instance customizing the limit of message length, this tool assumes a default length of 500 caracters. When used with the `--merge` parameter, it can result in truncated messages.
