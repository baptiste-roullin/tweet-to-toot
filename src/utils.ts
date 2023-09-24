export function err(msg) {
	// Create an error without stack trace to avoid calculating the stack trace twice.
	Error.stackTraceLimit = 0
	throw new Error(msg)
}