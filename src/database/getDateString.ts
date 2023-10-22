export default function getDateString(dateArg: string) {
	let date = new Date(dateArg)
	let dateStr = date.toISOString().replace(/[T]/, " ").replace(/Z/, "")
	return dateStr
}