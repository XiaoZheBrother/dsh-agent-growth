import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync,rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GrowthStore } from '../core.js'
import { runOne,WORKER_TOOLS } from '../index.js'

function setup(t) {
  const dir=mkdtempSync(join(tmpdir(),'growth-runner-'))
  const store=new GrowthStore(dir,{timeoutMs:1000})
  store.enqueue({id:'test',kind:'learn',due:0,sources:[{id:'source',text:'Test evidence',asOf:'2026-01-01'}]})
  t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true})})
  return store
}
const base={agentDefaultModel:{currentSelection:()=>({provider:'test',model:'test'})}}

test('creation observes timeout and records failed attempt',async t=>{
  const store=setup(t)
  const ctx={...base,agents:{create:({signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))}}
  const result=await runOne(ctx,store,'Test')
  assert.equal(result.state,'failed');assert.match(result.error,/timed out/)
  assert.equal(store.status()[0].state,'failed')
})

test('native tool schemas compile; worker guard denies unrelated tools; shutdown cancels and disposes',async t=>{
  const store=setup(t),controller=new AbortController()
  let guard,disposed=false,cancelled=false
  const registered=[]
  const ctx={...base,agents:{create:async options=>{
    options.setup({on:()=>()=>{},tools:{presentAs:value=>assert.equal(value,'native'),restrict:()=>{},guard:fn=>{guard=fn},register:tool=>registered.push(tool)}})
    return {agent:{followup:()=>setTimeout(()=>controller.abort(),10),whenIdle:()=>new Promise(()=>{}),cancel:()=>{cancelled=true}},dispose:async()=>{disposed=true}}
  }}}
  const result=await runOne(ctx,store,'Test',controller.signal)
  assert.equal(registered.length,7)
  for(const name of WORKER_TOOLS) assert.equal(guard({name}),undefined)
  for(const name of ['shell','bili_comment','agent_growth_status']) assert.equal(typeof guard({name}),'string')
  assert.equal(result.state,'failed');assert.ok(cancelled);assert.ok(disposed)
})
