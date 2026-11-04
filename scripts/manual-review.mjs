import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve, extname, join } from 'node:path';
import { spawn } from 'node:child_process';
const root=resolve('dist/balanca-web/browser'), out=resolve(process.env.QA_OUTPUT || 'docs/qa-final');await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon','.png':'image/png'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){res.writeHead(404);res.end();return;}const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(path!==root&&!path.startsWith(root+'\\'))throw Error('Invalid path');let data,file=path;try{data=await readFile(file);}catch{file=join(root,'index.html');data=await readFile(file);}res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const profile=resolve('.angular/qa-final-browser');await mkdir(profile,{recursive:true});await rm(join(profile,'DevToolsActivePort'),{force:true});
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket;const errors=[],results=[],checks=[];let counter=0;const pending=new Map();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
  let info;for(let n=0;n<100;n++){try{info=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');break;}catch{await sleep(100);}}if(!info)throw Error('Chrome debugger unavailable');
  socket=new WebSocket(`ws://127.0.0.1:${info[0]}${info[1]}`);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
  socket.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p?.reject(Error(JSON.stringify(msg.error))):p?.resolve(msg.result);}if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails);if(msg.method==='Log.entryAdded'&&msg.params.entry.level==='error')errors.push(msg.params.entry);};
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++counter;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
  const target=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true});const call=(m,p)=>send(m,p,sessionId);
  await call('Page.enable');await call('Runtime.enable');await call('Log.enable');
  const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
  const wait=async expression=>{for(let n=0;n<100;n++){if(await evaluate(expression))return;await sleep(50);}throw Error('Timeout: '+expression);};
  // Cliques de ponteiro reais: detecta overlays e pointer-events que .click() ignora.
  const clickButton=async expression=>{
    const point=await evaluate(`(()=>{const b=${expression};if(!b||b.disabled)throw Error('Missing/enabled button');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;if(!b.contains(document.elementFromPoint(x,y)))throw Error('Button covered: '+b.textContent);return {x,y};})()`);
    await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});await sleep(120);
  };
  const clickText=async text=>clickButton(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)} || b.querySelector(':scope > strong')?.textContent.trim()===${JSON.stringify(text)})`);
  const fill=async(label,value)=>{await evaluate(`(()=>{const l=[...document.querySelectorAll('label')].find(l=>l.textContent.trim().startsWith(${JSON.stringify(label)}));const input=l?.querySelector('input,textarea');if(!input)throw Error('Missing input '+${JSON.stringify(label)});input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}));})()`);await sleep(100);};
  const check=async(expression,name)=>{if(!await evaluate(expression)){
    const details=await evaluate("(()=>{const d=document.querySelector('.access-display');return {url:location.pathname,display:d?.outerHTML,overflow:d?getComputedStyle(d).overflow:null,overflowX:d?getComputedStyle(d).overflowX:null,overflowY:d?getComputedStyle(d).overflowY:null,fonts:[...document.fonts].map(f=>({family:f.family,status:f.status}))};})()");
    await writeFile(join(out,'failure.json'),JSON.stringify({name,expression,details},null,2));throw Error('Failed: '+name+' '+JSON.stringify(details));
  }checks.push(name);};
  const select=async(label,value,index=false)=>{await evaluate(`(()=>{const l=[...document.querySelectorAll('label')].find(l=>l.textContent.trim().startsWith(${JSON.stringify(label)}));const s=l?.querySelector('select');if(!s){const c=l?.querySelector('input[type=checkbox]');if(!c)throw Error('Missing select/switch');const checked=${index?value===0:!!value};if(c.checked!==checked)c.click();return;}${index?`s.selectedIndex=${value}`:`s.value=${JSON.stringify(value)}`};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(100);};
  const navigate=async path=>{await clickButton(`document.querySelector('button[routerlink="${path}"]')`);await wait(`location.pathname===${JSON.stringify(path)} && !!document.querySelector('h1')`);await evaluate('window.scrollTo(0,0)');};
  await call('Page.navigate',{url:base});await wait(`document.querySelector('h1')?.textContent==='Pesagem'`);
  await navigate('/configuracoes');await select('Unidade (LOV mock)','demo-japy');await select('Estação / balança','demo-japy-1');await check("document.querySelector('.header-context').textContent.includes('Esta\u00e7\u00e3o 01')",'Contexto selecionado sem aplicar');await select('Gestão de Veículos (SGV)',0,true);await clickText('Salvar configurações');await clickText('Gestão de Veículos');await select('Cancelas',0,true);await select('Cancela de Entrada','gate-01');await select('Cancela de Saída','gate-02');await select('Semáforos',0,true);await select('Display',0,true);await clickText('Salvar configurações');
  for(const [width,height] of [[1920,1080],[1600,900],[1366,768]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    for(const [path,title] of [['/pesagem','Pesagem'],['/cadastros','Cadastros'],['/relatorios','Relatórios'],['/tickets','Tickets'],['/configuracoes','Configurações']]){
      await navigate(path);await wait(`document.querySelector('h1')?.textContent===${JSON.stringify(title)}`);await sleep(100);
      const geometry=await evaluate(`({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,title:document.querySelector('h1').textContent,actionsBottom:document.querySelector('.action-bar')?.getBoundingClientRect().bottom??null,buttons:[...document.querySelectorAll('button:disabled')].map(b=>b.textContent.trim())})`);
      results.push({path,...geometry});if(geometry.scrollWidth>width+1)throw Error('Horizontal overflow '+path+' '+width+' '+geometry.scrollWidth);
      const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(out,`${path.slice(1)}-${width}x${height}.png`),Buffer.from(shot.data,'base64'));if(path==='/pesagem'&&geometry.actionsBottom>height)throw Error('Actions outside viewport '+width+' '+geometry.actionsBottom);
    }
  }
  await navigate('/cadastros');
  const registryTabs=await evaluate("[...document.querySelectorAll('main .tabs button')].map(b=>b.textContent.trim())");
  for(const text of registryTabs){await clickText(text);await check(`document.querySelector('main .tabs .selected')?.textContent.trim()===${JSON.stringify(text)} && !!document.querySelector('main tbody')`,'Aba Cadastro: '+text);}
  await navigate('/relatorios');
  const reportTabs=await evaluate("[...document.querySelectorAll('.cards button strong')].map(b=>b.textContent.trim())");
  for(const text of reportTabs){await clickText(text);await check(`document.querySelector('main h2')?.textContent===${JSON.stringify(text)}`,'Relatório: '+text);}
  await navigate('/configuracoes');await select('Unidade (LOV mock)','demo-matriz');
  await check("document.querySelector('.header-context').textContent.includes('MATRIZ') && document.querySelector('.header-context').textContent.includes('01')",'Estação única selecionada automaticamente');
  await navigate('/pesagem');await check("!document.querySelector('.access')",'Configuração isolada da outra estação');
  await navigate('/configuracoes');await select('Unidade (LOV mock)','demo-japy');await select('Estação / balança','demo-japy-1');
  await check("[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Gestão de Veículos (SGV)')).querySelector('input').checked",'Configuração recuperada ao retornar à estação');
  await select('Gestão de Veículos (SGV)',false);await clickText('Salvar configurações');
  await navigate('/pesagem');await check("!document.querySelector('.access')",'SGV OFF oculta painel');
  await navigate('/configuracoes');await select('Gestão de Veículos (SGV)',true);await clickText('Salvar configurações');
  for(const enabled of ['nenhum','Cancelas','Semáforos','Display']){
    await navigate('/configuracoes');await clickText('Gestão de Veículos');
    for(const label of ['Cancelas','Semáforos','Display'])await select(label,label===enabled);
    if(enabled==='Display')await fill('Mensagem do display','COOXUPÉ BALANÇA INFORMAÇÃO - ENTRADA 01');
    await clickText('Salvar configurações');await navigate('/pesagem');
    await check(`!!document.querySelector('.access') && document.querySelectorAll('.gate').length===${enabled==='Cancelas'?2:0} && document.querySelectorAll('.traffic-light').length===${enabled==='Semáforos'?2:0} && !!document.querySelector('.access-display')===${enabled==='Display'}`,'Dispositivos independentes: '+enabled);
    if(enabled==='Display'){
      await check("document.querySelector('.access-display').textContent.includes('COOXUPE BALANCA INFORMACAO')",'Display sanitizado');
      await check("getComputedStyle(document.querySelector('.access-display')).overflow==='hidden'",'Display recortado');
      await evaluate('document.fonts.ready.then(()=>true)');
      await check("document.fonts.check('30px DS-Digital')",'Fonte digital carregada');
    }
  }
  await navigate('/configuracoes');await clickText('Gestão de Veículos');
  for(const label of ['Cancelas','Semáforos','Display'])await select(label,true);
  await fill('Mensagem do display','COOXUPÉ');await clickText('Salvar configurações');
  const fields=await evaluate("[...document.querySelectorAll('main label select')].map(s=>({label:s.parentElement.firstChild.textContent,width:s.getBoundingClientRect().width}))");
  checks.push({name:'Larguras das LOVs de equipamentos',fields});
  if(fields.some(f=>f.width>301))throw Error('LOV desproporcional');
  const settingsShot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(out,'gestao-veiculos-1366x768.png'),Buffer.from(settingsShot.data,'base64'));
  await navigate('/pesagem');
  await evaluate("document.querySelectorAll('.gate-simulation-select').forEach(s=>{s.value='aberta';s.dispatchEvent(new Event('change',{bubbles:true}));})");await sleep(550);
  await check("[...document.querySelectorAll('.gate')].every(g=>{const a=g.querySelector('span').getBoundingClientRect(),r=g.getBoundingClientRect();return a.top>=r.top && a.bottom<=r.bottom && a.left>=r.left && a.right<=r.right;}) && document.querySelectorAll('.traffic-light .green.on').length===2",'Hastes abertas contidas na cena e semáforos verdes');
  const gateShot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(out,'cancelas-abertas-1366x768.png'),Buffer.from(gateShot.data,'base64'));
  for(const weight of ['28450','12000']){
    await evaluate("document.querySelector('[data-action=manual]').click()");await sleep(100);
    await fill('Usu\u00e1rio','demo');await fill('Senha','demo');await fill('Justificativa obrigat\u00f3ria','QA local - contingencia');await clickText('Liberar');await fill('Peso manual (kg)',weight);await clickText('Prosseguir');await clickText('Confirmar Pesagem');
  }
  await check("document.querySelector('[data-action=salvar]').disabled && document.querySelector('.summary-grid').textContent.includes('28.450')",'Abertura/fechamento manual e regra F10');
  await navigate('/tickets');await clickText('Emitir ticket mock da pesagem atual');await check("!!document.querySelector('.dialog svg')",'Emissao mock e Code39');await clickText('Fechar');
  await clickText('Cancelar ticket');await fill('Justificativa obrigat\u00f3ria','QA cancelamento logico');await clickText('Confirmar cancelamento');await check("document.querySelector('tbody').textContent.includes('Cancelado')",'Cancelamento logico');
  await clickText('Reimprimir (mock)');await check("!!document.querySelector('.cancelled')",'Reimpressao cancelada preserva marca');
  const ticketShot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(out,'ticket-cancelado-preview.png'),Buffer.from(ticketShot.data,'base64'));await clickText('Fechar');
  await navigate('/cadastros');await clickText('Transportadoras');await clickText('Incluir');await fill('Nome *','Transportadora QA');await clickText('Salvar');await fill('Pesquisar','Transportadora QA');await clickText('Editar');await fill('Nome *','Transportadora QA alterada');await clickText('Salvar');await check("document.querySelector('tbody').textContent.includes('QA alterada')",'Cadastro inclusao/edicao/pesquisa');await clickText('Inativar');await clickText('Confirmar inativa\u00e7\u00e3o');await check("document.querySelector('tbody').textContent.includes('Nenhum registro')",'Inativacao sem exclusao fisica');
  await navigate('/relatorios');await clickText('Relat\u00f3rio de Pesagens');await clickText('Gerar relat\u00f3rio (mock)');await check("document.querySelector('tbody').textContent.includes('MOCK-P1')",'Relatorio pesagens com dados');await clickText('Relat\u00f3rio de Tickets');await clickText('Gerar relat\u00f3rio (mock)');await check("document.querySelector('tbody').textContent.includes('Cancelado')",'Relatorio tickets separado e atualizado');
  await writeFile(join(out,'runtime.json'),JSON.stringify({results,checks,errors},null,2));
  if(errors.length)throw Error('Runtime errors: '+JSON.stringify(errors));
  console.log(JSON.stringify({screens:results.length,checks:checks.length,errors:errors.length,output:out}));
  await send('Browser.close');
}finally{if(socket?.readyState===1){socket.send(JSON.stringify({id:++counter,method:'Browser.close'}));await sleep(100);}socket?.close();chrome.kill();await new Promise(r=>server.close(r));}
