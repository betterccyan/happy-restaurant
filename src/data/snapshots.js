// 自动备份（数据安全带）
// 快照放 IndexedDB，不占 localStorage 的 5MB 配额——业务数据 + 7 份快照挤在
// localStorage 里，配额一满就连正常写入都失败。
const DB_NAME = 'xfk_backup'
const STORE = 'snapshots'
const KEEP = 7

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('本机不支持 IndexedDB'))
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function readAll() {
  return openDb().then(
    (d) =>
      new Promise((resolve, reject) => {
        const tx = d.transaction(STORE, 'readonly')
        const req = tx.objectStore(STORE).getAll()
        req.onsuccess = () => resolve(req.result || [])
        req.onerror = () => reject(req.error)
      })
  )
}

// 保留最近 KEEP 份，其余删除（按写入时间，不按日期，手动备份也算一份）
async function prune() {
  const all = await readAll()
  if (all.length <= KEEP) return
  const extra = all.sort((a, b) => b.at - a.at).slice(KEEP)
  if (!extra.length) return
  const d = await openDb()
  await new Promise((resolve) => {
    const tx = d.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    extra.forEach((r) => store.delete(r.id))
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

export async function putSnapshot(payload, tag = 'auto') {
  if (typeof payload !== 'string' || !payload) throw new Error('快照内容为空')
  const d = await openDb()
  const rec = { id: uid(), at: Date.now(), tag, size: payload.length, payload }
  await new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(rec)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  await prune()
  return rec.id
}

// 列表只返回元信息，不把 payload 带出来（7 份全量会白占内存）
export async function listSnapshots() {
  const all = await readAll()
  return all
    .map(({ id, at, tag, size }) => ({ id, at, tag, size }))
    .sort((a, b) => b.at - a.at)
}

export async function getSnapshot(id) {
  const d = await openDb()
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

export async function latestSnapshot() {
  const list = await listSnapshots()
  if (!list.length) return null
  return getSnapshot(list[0].id)
}

export async function clearSnapshots() {
  const d = await openDb()
  await new Promise((resolve) => {
    const tx = d.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

// 每天首次打开留一份，当天已有则跳过（重复打开不会把快照挤掉）
export async function autoSnapshotToday(payload) {
  const list = await listSnapshots()
  const dayStart = new Date().setHours(0, 0, 0, 0)
  if (list.some((s) => s.tag === 'auto' && s.at >= dayStart)) return false
  await putSnapshot(payload, 'auto')
  return true
}
