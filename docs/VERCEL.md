# Publicar e ativar o banco na Vercel

O Várzuno 3 usa **Vercel Functions + PostgreSQL Neon**, com cadastro próprio por nome, e-mail, telefone, posição e senha. Não usa login Google, Facebook, ChatGPT ou Sites.

## 1. Configuração do projeto

No projeto `varzuno` da Vercel, importe/atualize a branch `main` de `zrpires/varzuno`.

- **Root Directory:** raiz do repositório.
- **Framework Preset:** Other.
- **Node.js:** 22.x.
- **Install Command:** `npm ci --ignore-scripts`.
- **Build Command:** `npm run build`.
- **Output Directory:** `dist`.

Esses valores já estão em `vercel.json`. Se houver uma substituição antiga no painel apontando para `public`, remova-a ou altere para `dist`. Publique o repositório inteiro; a pasta `api/` contém a função que atende cadastro, login e banco.

## 2. Conectar o banco — necessário para cadastrar contas

1. No painel da Vercel, abra **Storage → Create Database / Marketplace** e selecione **Neon (Postgres)**.
2. Crie/conecte o banco ao projeto Várzuno. Escolha o plano de acordo com sua necessidade e confirme no próprio painel.
3. Em **Settings → Environment Variables**, confira se a integração criou **`DATABASE_URL`** para **Production**. `POSTGRES_URL` também é aceito. Caso a integração use outro prefixo, copie a conexão para `DATABASE_URL` dentro do painel da Vercel.
4. Faça **Redeploy** do commit mais recente. O build prepara automaticamente as tabelas no esquema PostgreSQL `varzuno`.

`DATABASE_URL` contém a credencial do banco: ela fica só no servidor. Não use prefixos `NEXT_PUBLIC_` ou `VITE_`, não publique no GitHub e não envie essa URL em mensagens.

Se usar Preview/Development, prefira conexões/branches separadas do banco de produção.

**Sem banco conectado**, o site continua abrindo e o convidado local funciona. O cadastro/login de contas fica desativado com uma mensagem explicando a configuração; não finge salvar dados na nuvem.

## 3. Conferir o resultado

Abra `/api/health` no domínio publicado:

```json
{"ok":true,"databaseConfigured":true,"cloudReady":true}
```

Se `databaseConfigured` for `false`, falta conectar a variável. Se aparecer uma mensagem de migração, faça Redeploy depois de conectar o banco.

Depois, abra o aplicativo e use **Criar conta**, preenchendo nome, e-mail, telefone com DDD, posição e senha de pelo menos 8 caracteres. O acesso seguinte usa e-mail e senha. Cada conta pode guardar até 50 peladas. No perfil, nome, telefone e posição podem ser alterados; o e-mail de acesso permanece fixo.

## O que causava a tela parada

A publicação anterior entregava apenas os arquivos de `public`, mas `app.js` importava um `core.js` inexistente naquela saída. Além disso, `/api/session` e as outras rotas eram exclusivas do servidor antigo, não existiam na Vercel. Isso interrompia a inicialização antes de mostrar o conteúdo.

Agora o build copia o conjunto completo para `dist`, inclui `core.js`, adiciona o carregador com mensagem de erro e configura as rotas `/api/*` para a função Node.js. As dependências esbuild/Drizzle e seus scripts nativos foram retirados deste projeto Vercel.

As linhas `npm fund`, `cache-dir` e `npm warn install-scripts` do log original eram avisos. Elas não corrigiriam os 404 nem conectariam o banco antigo à Vercel.

## Referências oficiais

- [Postgres na Vercel e integração pelo Marketplace](https://vercel.com/docs/postgres)
- [Driver HTTP serverless do Neon](https://neon.com/docs/serverless/serverless-driver)
