export interface Tweet {
	date: Date
	id: string
	id_str: string
	full_text: string
	truncated: Boolean
	retweet_count: number
	favorite_count: number
	quote_count: number
	reply_count: number
	in_reply_to_status_id: string
	in_reply_to_status_id_str: string
	in_reply_to_user_id: string
	in_reply_to_user_id_str: string
	in_reply_to_screen_name: string // use the db row instead of the json
	entities: Record<string, any>
	extended_entities: Record<string, any>
	lang: string,
	referenced_tweets?: []

}


export interface Params {
	wait?: number
	concatWith?: string
	mergeQuote?: boolean
	ids: string[]
	intro?: string
}
