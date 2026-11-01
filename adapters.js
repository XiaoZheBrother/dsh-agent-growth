import { readdirSync, lstatSync, readFileSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import { digest } from './core.js'

export function importEvent(store,event) {
  if(!event || event.version!==1) throw new Error('Expected event version 1')
  if(event.type==='task') return [store.enqueue(event.job)]
  if(event.type!=='bilibili-snapshot') throw new Error('Unsupported adapter type')
  const {bvid,publishedAt,capturedAt,statistics,observations=[]}=event
  if(!/^BV[0-9A-Za-z]{10}$/.test(bvid||'')) throw new Error('Invalid BV')
  const published=Date.parse(publishedAt),captured=Date.parse(capturedAt)
  if(!Number.isFinite(published) || !Number.isFinite(captured) || captured<published || captured>store.clock()+60000) throw new Error('Invalid snapshot time')
  if(!statistics || typeof statistics!=='object' || Array.isArray(statistics) || !Object.values(statistics).every(v=>Number.isFinite(v)&&v>=0)) throw new Error('Invalid statistics')
  if(!Array.isArray(observations) || observations.length>30 || observations.some(v=>typeof v!=='string'||v.length>2000)) throw new Error('Invalid observations')
  const source={id:`bilibili:${bvid}:${capturedAt}:${digest({statistics,observations}).slice(0,12)}`,
    text:JSON.stringify({bvid,publishedAt,capturedAt,statistics,observations}),asOf:capturedAt,url:`https://www.bilibili.com/video/${bvid}/`,partial:true}
  const results=[]
  for(const hours of [0,24,72]) {
    const id=`bilibili:${bvid}:review:${hours}`
    if(captured>=published+hours*3600000 && !store.db.prepare('SELECT id FROM jobs WHERE id=?').get(id)) {
      const previous=store.db.prepare("SELECT payload FROM sources WHERE id LIKE ? ORDER BY id DESC LIMIT 3").all(`bilibili:${bvid}:%`).map(r=>JSON.parse(r.payload)).filter(s=>s.id!==source.id)
      results.push(store.enqueue({id,kind:'review',due:captured,sources:[...previous,source],instruction:
        `Review window ${hours}h. Snapshot captured ${capturedAt}, publication ${publishedAt}. Late samples are late samples, not historical measurements. Missing metrics are unknown; no causal conclusions from one sample.`}))
    }
  }
  return results
}

export function importInbox(store,directory) {
  if(!directory) return []
  if(!isAbsolute(directory) || lstatSync(directory).isSymbolicLink()) throw new Error('Inbox must be an absolute real directory')
  const results=[]
  const names=readdirSync(directory).filter(n=>/^[a-zA-Z0-9_.-]+\.json$/.test(n)).sort()
  if(names.length>1000) throw new Error('Inbox exceeds 1000 files; archive processed files before continuing')
  for(const name of names) {
    if(results.length>=100) break
    const path=join(directory,name)
    let hash
    try {
      const stat=lstatSync(path)
      if(!stat.isFile() || stat.isSymbolicLink() || stat.size>512000) throw new Error('Invalid inbox file')
      const raw=readFileSync(path,'utf8');hash=digest(raw)
      if(store.db.prepare('SELECT hash FROM imports WHERE path=?').get(path)?.hash===hash) continue
      const value={file:name,results:importEvent(store,JSON.parse(raw))}
      results.push(value)
      store.db.prepare('INSERT OR REPLACE INTO imports VALUES(?,?,?)').run(path,hash,JSON.stringify(value))
    } catch(error) {
      const value={file:name,error:error.message};results.push(value)
      if(hash) store.db.prepare('INSERT OR REPLACE INTO imports VALUES(?,?,?)').run(path,hash,JSON.stringify(value))
    }
  }
  return results
}

export function queueMemoryReview(store, intervalDays=7) {
  const artifacts=store.recall('',8)
  if(!artifacts.length) return null
  const bucket=Math.floor(store.clock()/(intervalDays*86400000))
  const id=`memory-review:${bucket}`
  if(store.db.prepare('SELECT id FROM jobs WHERE id=?').get(id)) return null
  return store.enqueue({id,kind:'memory',due:store.clock(),sources:artifacts.map(r=>({
    id:`artifact:${r.job}:${digest(r.body)}`,text:store.db.prepare('SELECT result FROM jobs WHERE id=?').get(r.job).result,asOf:r.at,partial:false,artifactId:r.job})),
    instruction:'Consolidate repeated observations, identify contradictions, explain changes. Preserve earlier versions, distinguish evidence from guesses. Use supersedes only for earlier result IDs actually reviewed; never change identity, permissions or policy.'})
}
