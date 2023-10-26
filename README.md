# Tweet To Toot – export your Twitter threads to Mastodon


You want to break free of the site formerly known as Twitter but do not want to lose your numerous, ongoing, carefully maintained, years-long threads?

Tweet-to-Toot is for your: [grab an archive](https://twitter.com/settings/download_your_data) of your Twitter account, republish the threads your want on Mastodon and start anew.

Under the hood is a heavy fork of [Tweetback](https://github.com/tweetback/tweetback) and [a client](https://github.com/neet/masto.js/) for the Mastodon API.

it works with pictures and videos. It even flattens branching threads (meaning: if you replied several times to the same tweet, all replies with be inserted in the main thread).

## Setup


- Install [Node](https://nodejs.org/en), v18 or 19. NVM advised if it's not your typical Node environnment.
- In your terminal, go to the folder of your archive.
- Run `npm install tweet-to-toot`.
- Grab a Mastodon API token by following [these instructions](https://neet.github.io/masto.js/#md:quick-start).
- Add the token and the URL of you instance as environnment variables. The simplest way is to put them in a file named `.env` (no extension) at the root of your project. See `.env.sample.`

## Usage

`npx totoot --ids 0000000000 [optional parameters]`

Full examples:

- `npx totoot --ids 1157670494390378498 --intro "imported thread, started in 2019 on the Other Site" --dry-run`

- `npx totoot --ids 1157670494390378498 791709895083102209 --wait 10 --lang en`


## Parameters

`--ids`: One or several space-separated IDs of twitter messages. These ID can be found at the end of their URL, after "status/". Tweet-to-Toot will use these as a starting poing and find more recent replies in your archive. So choose the oldest message in your thread.

`--intro`: Optional short text in quotes. Append a message at the beginning of your Mastodon thread.

`--wait`: Number of seconds. Waiting period between each request to Mastodon. Default : one second.

`--dry-run`: Show thread without publishing it.

`--merge`:  Default to false. Defines behavior for quoted tweets of yourself. If false, it will keep the quote as a link to Twitter.com. If true, it will merge the quoting and the quoted message. The URL to the quoted message is preserved.

`--concatWith`: Optional Mastodon message id. If provided, the thread will be posted as a continuation of this message. Useful if you want merge threads.

`--lang`: Optional. Set language for the Mastodon thread. Use a 639-1 string ("en" for english, "fr" for french...).

Note on languages:

- By default, we use the attribute present in each message of your Twitter archive, because it seems good at guessing languages (or at least western mainstream ones). So it's useful for preserving multi-lingual threads.
- The priority order is: the `--lang` parameter, then the attribute from your archive, then the parameter from your Mastodon account.

## Caveats

- Twitter can show threads with deleted messages in the middle. We can't. Workaround: Use it twice and the second time specifiy a `concatWith` option.
- Use `wait` generously. With media, the default rate limit of your instance can be quickly reached.
- Mastodon doesn't officially support a way for instances to customize a limit to message length. So this tool assumes a default length of 500 caracters. When used with the `--merge` parameter, it can result in truncated messages.
