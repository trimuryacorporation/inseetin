async function removeHistoryExpiry(Log) {
 let indexes
 try { indexes = await Log.collection.indexes() } catch (error) { if (error.code === 26) return []; throw error }
 const removed = []
 for (const index of indexes) {
  if (Object.keys(index.key).length === 1 && index.key.createdAt === 1 && index.expireAfterSeconds !== undefined) {
   await Log.collection.dropIndex(index.name)
   removed.push(index.name)
  }
 }
 return removed
}
async function applyPermanentDeveloperPolicy({ Log, Key, Setting, convertActiveKeys = false }) {
 const removedIndexes = await removeHistoryExpiry(Log)
 if (!convertActiveKeys) return { removedIndexes, convertedKeys: 0 }
 const migrationKey = 'developerApiPermanentAccessV1'
 const done = await Setting.findOne({ key: migrationKey }).lean()
 if (done?.value?.completedAt) return { removedIndexes, convertedKeys: 0 }
 const now = new Date()
 const result = await Key.updateMany({ revokedAt: null, expiresAt: { $gt: now }, createdAt: { $lte: now } }, { $set: { expiresAt: null } })
 await Setting.findOneAndUpdate({ key: migrationKey }, { $set: { value: { completedAt: now.toISOString() } } }, { upsert: true, new: true })
 return { removedIndexes, convertedKeys: result.modifiedCount }
}
module.exports = { removeHistoryExpiry, applyPermanentDeveloperPolicy }
