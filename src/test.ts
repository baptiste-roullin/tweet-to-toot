import timers from 'node:timers/promises'

(async function () {
	for (let tweet of [1, 1, 1, 1, 1]) {
		console.log("wait")
		await timers.scheduler.wait(5000)

	}
})()
