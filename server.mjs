import http from 'node:http';
import {readFileSync} from 'node:fs';
const server=http.createServer((req,res)=>{try{const file=new URL('./index.html',import.meta.url);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(readFileSync(file));}catch{res.writeHead(500);res.end('Build required');}});
server.listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
