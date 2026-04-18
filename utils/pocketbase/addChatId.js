require('dotenv').config()
const { authPocketbase, pb } = require('./connect')

const networkType = process.env.NETWORK_TYPE

async function addChatId(chatId) {
	await authPocketbase()

	const existingRecord = await pb.collection(`users_${networkType}`).getFullList({
		filter: `chatId="${chatId}"`,
	})

	if (!existingRecord.length) {
		await pb.collection(`users_${networkType}`).create({ chatId, results: 1 })
	}
}

module.exports = {
	addChatId,
}
