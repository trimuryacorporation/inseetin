const fs=require('node:fs')
const {spawnSync}=require('node:child_process')
const tests=fs.readdirSync(__dirname).filter(name=>/\.test\.(?:cjs|mjs)$/.test(name)).map(name=>require('node:path').join(__dirname,name))
const result=spawnSync(process.execPath,['--test',...tests],{stdio:'inherit'})
process.exitCode=result.status??1
