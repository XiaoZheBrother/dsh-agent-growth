#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { isAbsolute } from 'node:path'
import { GrowthStore } from './core.js'
import { importEvent } from './adapters.js'
const [command,directory,file]=process.argv.slice(2)
if(!['import','status','recall'].includes(command)||!directory||!isAbsolute(directory)) {
  console.error('Usage: dsh-growth <import|status|recall> <absolute-data-directory> [event.json]')
  process.exitCode=1
} else {
  const store=new GrowthStore(directory)
  try {
    const value=command==='import'?importEvent(store,JSON.parse(readFileSync(file,'utf8'))):command==='status'?store.status():store.recall()
    console.log(JSON.stringify(value,null,2))
  } catch(error) { console.error(error.message);process.exitCode=1 }
  finally { store.close() }
}
