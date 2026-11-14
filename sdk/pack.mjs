#!/usr/bin/env node
// MIT. node sdk/pack.mjs <project> [output]
import fs from 'node:fs/promises';import path from 'node:path';import {collectBundle,digest} from './project.mjs';
const root=path.resolve(process.argv[2]||'.'),bundle=await collectBundle(root),raw=JSON.stringify(bundle),out=path.resolve(process.argv[3]||path.join(root,'dist',bundle.manifest.id+'-'+bundle.manifest.version+'.nous-plugin.json'));await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,raw);console.log(JSON.stringify({file:out,bytes:Buffer.byteLength(raw),sha256:digest(Buffer.from(raw))}));
