import {build,transform} from 'esbuild';
import {readFile,mkdir,cp,writeFile,rm} from 'node:fs/promises';
const files={'/':['public/index.html','text/html; charset=utf-8'],'/style.css':['public/style.css','text/css; charset=utf-8'],'/app.js':['public/app.js','text/javascript; charset=utf-8'],'/core.js':['src/core.js','text/javascript; charset=utf-8'],'/favicon.svg':['public/favicon.svg','image/svg+xml']};
const assets={};for(const [route,[path,type]] of Object.entries(files)){let body=await readFile(path,'utf8');if(path.endsWith('.js'))body=(await transform(body,{loader:'js',minify:true,target:'es2022'})).code;if(path.endsWith('.css'))body=(await transform(body,{loader:'css',minify:true})).code;assets[route]={type,body};}
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await build({entryPoints:['src/worker.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',target:'es2022',minify:true,plugins:[{name:'assets',setup(builder){builder.onResolve({filter:/^virtual:assets$/},()=>({path:'assets',namespace:'inline-assets'}));builder.onLoad({filter:/.*/,namespace:'inline-assets'},()=>({contents:'export default '+JSON.stringify(assets),loader:'js'}));}}]});
await cp('.openai/hosting.json','dist/.openai/hosting.json');await cp('drizzle','dist/drizzle',{recursive:true});
const {default:worker}=await import('../dist/server/index.js?build='+Date.now());
for(const path of Object.keys(files)){const response=await worker.fetch(new Request('https://test.invalid'+path),{});if(response.status!==200)throw Error('Built asset missing: '+path);}
console.log('Worker ESM e arquivos estáticos verificados.');
