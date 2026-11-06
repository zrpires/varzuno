export const security={
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'strict-origin-when-cross-origin',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'",
 'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
};
export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
export function json(status,value,headers={}){return new Response(JSON.stringify(value),{status,headers:{...security,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});}
export function sameOrigin(request){const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)throw new HttpError(403,'Origem não permitida.');if(request.headers.get('Sec-Fetch-Site')==='cross-site')throw new HttpError(403,'Requisição de outro site não permitida.');}
export async function requestBody(request){
 if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))throw new HttpError(415,'Envie dados em JSON.');
 if(!request.body)throw new HttpError(400,'Dados ausentes.');
 const reader=request.body.getReader(),chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>2000000){await reader.cancel();throw new HttpError(413,'O limite por requisição é de 2 MB.');}chunks.push(value);}
 const data=new Uint8Array(length);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
 let parsed;try{parsed=JSON.parse(new TextDecoder().decode(data));}catch{throw new HttpError(400,'JSON inválido.');}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new HttpError(400,'Envie um objeto JSON.');return parsed;
}
export function name(value,max=50){if(typeof value!=='string'||value.trim().length<2||value.length>max||/[\u0000-\u001f]/.test(value))throw new HttpError(400,`Informe um nome de 2 a ${max} caracteres.`);return value.trim();}
export function leagueId(value){if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new HttpError(400,'Identificador de pelada inválido.');return value;}
export function revision(value){if(!Number.isSafeInteger(value)||value<0)throw new HttpError(400,'Revisão inválida.');return value;}
