import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync,rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GrowthStore } from '../core.js'
import { validateExploration } from '../exploration.js'
const snapshot=()=>({interests:[{id:'question-1',question:'Why does this happen?',why:'I do not know yet.',status:'active'}],surprise:'None yet',beliefChange:'Unchanged',nextExperiment:'Compare examples',share:{decision:'hold',reason:'No evidence yet'},request:{kind:'search',target:'examples',reason:'Find a counterexample'}})
test('exploration validates proposals without granting arbitrary actions',()=>{
  assert.equal(validateExploration(JSON.stringify(snapshot())).share.decision,'hold')
  for(const kind of ['shell','comment','install','publish']) assert.throws(()=>validateExploration({...snapshot(),request:{kind,target:'x',reason:'x'}}))
  assert.throws(()=>validateExploration({...snapshot(),share:{decision:'publish',reason:'x'}}))
  assert.throws(()=>validateExploration({...snapshot(),interests:Array(4).fill(snapshot().interests[0])}))
})
test('exploration retains history, receipts and shared budget; malformed save is recoverable',t=>{
  const dir=mkdtempSync(join(tmpdir(),'curiosity-'))
  const store=new GrowthStore(dir,{dailyBudget:1})
  t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true})})
  const job=id=>({id,kind:'explore',due:0,sources:[{id:'evidence',text:'Actual observed excerpt',asOf:'2026-11-03',partial:true}]})
  store.enqueue(job('a'));store.enqueue(job('b'));const lease=store.claim('fish')
  store.source(lease,'evidence')
  assert.throws(()=>store.save(lease,{title:'Notes',body:'No finding',citations:['evidence']}))
  store.save(lease,{title:'Notes',body:'No finding',citations:['evidence'],exploration:JSON.stringify(snapshot())})
  assert.equal(store.readback(lease).exploration.interests[0].id,'question-1');store.finish(lease)
  assert.equal(store.recall()[0].exploration.share.decision,'hold')
  assert.equal(store.recall()[0].citations[0].complete,false)
  assert.equal(store.claim('second'),null)
})
test('execution-day exploration cap includes carried jobs and leaves room for other work',t=>{
  let time=Date.parse('2026-11-03T01:00:00Z')
  const dir=mkdtempSync(join(tmpdir(),'curiosity-cap-'))
  const store=new GrowthStore(dir,{dailyBudget:5,clock:()=>time})
  t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true})})
  for(let i=0;i<4;i++) store.enqueue({id:`explore:yesterday:${i}`,kind:'explore',due:0,sources:[{id:'s',text:'Observed',asOf:'2026-11-02'}]})
  store.enqueue({id:'review',kind:'review',due:1,sources:[{id:'s',text:'Observed',asOf:'2026-11-02'}]})
  for(let i=0;i<3;i++) {const lease=store.claim('fish');assert.equal(lease.kind,'explore');store.fail(lease,'Counts even on failure')}
  const review=store.claim('fish');assert.equal(review.kind,'review');store.fail(review,'test')
  assert.equal(store.claim('fish'),null)
  time+=86400000
  assert.equal(store.claim('fish').kind,'explore')
})
