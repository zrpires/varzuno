import('/app.js').catch(error=>{
 console.error('Varzuno startup failed:',error.name);
 const view=document.getElementById('view');if(!view)return;view.replaceChildren();
 const section=document.createElement('section');section.className='panel';const title=document.createElement('h1');title.textContent='Não foi possível iniciar o aplicativo.';const text=document.createElement('p');text.textContent='Recarregue a página. Se continuar, verifique se o deploy contém app.js e core.js.';const button=document.createElement('button');button.className='button primary';button.textContent='Tentar novamente';button.onclick=()=>location.reload();section.append(title,text,button);view.append(section);
});
