export function err(msg) {
	Error.stackTraceLimit = 0
	throw new Error(msg)
}

export function isValidHttpUrl(string) {
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
	outputDir: "./media/",
	urlPath: "/media/",
	cacheDuration: "*",
	filenameFormat: function (id, src, width, format, options) {
		return `${id}.${format}`
	}
}