require('dotenv').config()
const axios = require('axios')

const { authPocketbase, pb } = require('./utils/pocketbase/connect')
const config = require('./config.json')

const { networkType } = config

const getAverageBlockTime = async baseUrl => {
	try {
		const latestBlockResponse = await axios.get(`${baseUrl}/status`)
		const latestHeight = parseInt(latestBlockResponse.data.result.sync_info.latest_block_height, 10)

		const blockNowResponse = await axios.get(`${baseUrl}/block?height=${latestHeight}`)
		const blockThenResponse = await axios.get(`${baseUrl}/block?height=${latestHeight - 40}`)

		const timeNow = new Date(blockNowResponse.data.result.block.header.time)
		const timeThen = new Date(blockThenResponse.data.result.block.header.time)

		const difference = timeNow - timeThen

		const averageBlockTime = difference / 40
		return parseFloat((averageBlockTime / 1000).toFixed(3))
	} catch (error) {
		console.error('Error computing average block time:', error)
		return null
	}
}

const runPeriodicTasks = async () => {
	try {
		await authPocketbase()
		const records = await pb.collection(`projects_${networkType}`).getFullList()
		const projects = records[0].projects

		for (let project of projects) {
			const baseUrl = `https://${project}-${networkType}-rpc.itrocket.net`
			try {
				const averageTime = await getAverageBlockTime(baseUrl)
				if (averageTime) {
					const data = {
						project: project,
						time: averageTime,
					}

					try {
						const existingRecord = await pb.collection(`blockTime_${networkType}`).getFirstListItem(`project="${project}"`)

						if (existingRecord) {
							await pb.collection(`blockTime_${networkType}`).update(existingRecord.id, data)
						} else {
							await pb.collection(`blockTime_${networkType}`).create(data)
						}
					} catch (innerError) {
						if (innerError.status === 404) {
							console.log(`No existing record found for project ${project}. Creating new record.`)
							await pb.collection(`blockTime_${networkType}`).create(data)
						} else {
							throw innerError
						}
					}
				} else {
					console.log(`Failed to compute average block time for ${project}`)
				}
			} catch (error) {
				console.log('Error fetching for project', project, ':', error)
			}
		}
		console.log('Finished updating block time.')
	} catch (error) {
		console.error('Error during block time update', error)
	} finally {
		setTimeout(runPeriodicTasks, 10 * 60 * 1000)
	}
}

runPeriodicTasks()
