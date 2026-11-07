import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {GrowthStore} from '../core.js'
import {ExperienceStore,queueExperienceReviews} from '../experience.js'
test('evidence lifecycle preserves human candidates, separates tooling and keeps revisions',t=>{
 const dir=mkdtempSync(join(tmpdir(),'experience-'));const store=new GrowthStore(dir)
 t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true})})
 store.enqueue({id:'e',kind:'learn',due:0,sources:Array.from({length:8},(_,i)=>({id:`s${i}`,text:'observed',asOf:`2026-01-01T00:00:0${i}Z`}))})
 const e=new ExperienceStore(store), l=e.propose({text:'deploy first',scope:'skirmish',evidence:['s0'],origin:'human'})
 assert.throws(()=>e.recordTrial({id:'bad',lesson:l.id,session:'a',decision:'s1',outcome:'s0',verdict:'contradicted',attribution:'model-decision'}))
 for(let i=0;i<3;i++)e.recordTrial({id:`t${i}`,lesson:l.id,session:i?'b':'a',decision:`s${i}`,outcome:'s7',verdict:'contradicted',attribution:'tool-assisted'})
 assert.equal(e.list()[0].status,'candidate')
 for(let i=0;i<3;i++)e.recordTrial({id:`m${i}`,lesson:l.id,session:i?'b':'a',decision:`s${i}`,outcome:'s7',verdict:'contradicted',attribution:'model-decision'})
 assert.equal(e.list()[0].status,'suspended')
 assert.equal(queueExperienceReviews(store)[0].created,true)
 assert.equal(queueExperienceReviews(store)[0].created,false)
 assert.throws(()=>e.recordTrial({id:'m0',lesson:l.id,session:'a',decision:'s0',outcome:'s7',verdict:'supported',attribution:'model-decision'}))
 const r=e.revise({lesson:l.id,action:'revise',reason:'scope was too broad',evidence:['s7'],text:'deploy when safe',scope:'safe skirmish spawn'})
 assert.equal(e.list().find(x=>x.id===l.id).status,'superseded')
 assert.equal(e.list().find(x=>x.id===r.replacement).status,'candidate')
 assert.equal(store.db.prepare('SELECT count(*) n FROM sources').get().n,8)
})
