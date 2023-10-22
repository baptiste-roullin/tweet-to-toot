import fsp from 'node:fs/promises'

import debug from 'debug'

export const error = debug('threader:error')
export const warning = debug('threader:warning')
export const info = debug('threader:info')

export function err(msg) {
	Error.stackTraceLimit = 0
	throw new Error(msg)
}


export function isValidHttpUrl(string: string) {
	let url
	try {
		url = new URL(string)
		return true
	} catch (_) {
		return false
	}
}

export const ELEVENTY_IMG_OPTIONS = {
	widths: [null],
	formats: ["jpeg"],
	outputDir: "./data/tweets_media",
	urlPath: "/data/tweets_media",
	cacheDuration: "*",
	filenameFormat: function (id, src, width, format, options) {
		return `${id}.${format}`
	}
}

export async function fileExists(path) {
	try {
		await fsp.access(path)
		return true
	} catch {
		return false
	}
}