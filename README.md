# Várzuno

Organize sua pelada: atletas por posição/overall, sorteio equilibrado, partidas, gols, assistências, notas e rankings.

**Esta versão é feita para a Vercel.** O cadastro é próprio, com **nome, e-mail, telefone, posição e senha**. Não utiliza login por Sites, ChatGPT, Google ou Facebook.

## Publicar

A configuração já está em `vercel.json`: Node.js 22, Framework Other, `npm run build`, saída `dist` e rotas de API na Vercel.

**Para ativar cadastros e dados na nuvem, conecte Neon/Postgres ao projeto pelo Storage da Vercel e faça Redeploy.** A integração deve fornecer `DATABASE_URL` (ou `POSTGRES_URL`) ao servidor. O build cria o banco automaticamente no esquema `varzuno`.

[Passo a passo de configuração na Vercel](docs/VERCEL.md).

Sem banco conectado, o site abre e o **convidado local** funciona. As contas mostram uma mensagem de configuração, sem fingir salvar na nuvem.

## Funcionalidades

- Cadastro próprio; acesso posterior por e-mail e senha.
- Perfil com nome, telefone e posição editáveis.
- Até 50 peladas por conta; até 5 no convidado local.
- Elencos e resultados separados por pelada.
- Atletas com overall de 1 a 99 e posição principal.
- Sorteio de 2 a 4 times, com distribuição de goleiros e ajustes de troca.
- Partidas com gols, assistências, participações e notas opcionais de 0 a 10.
- Rankings, filtros por período, histórico, backup JSON e exportação CSV.
- Transferência dos registros locais para a conta após login.

O overall é manual e independente da média de notas. Participação é uma partida efetivamente disputada. Nota zero difere de ausência de avaliação. Pontos: 3 por vitória e 1 por empate. O sorteio é uma heurística, sem garantia de ótimo global.

## Convidado: dados neste navegador

Os registros do convidado ficam apenas no navegador e não têm proteção por senha. Não há sincronização entre dispositivos. Sair do modo convidado não apaga os dados; ao entrar como convidado novamente, as peladas podem ser retomadas. Limpar dados do navegador remove essa cópia. Exporte backups ou transfira para uma conta antes disso.

## Executar e verificar

```bash
npm ci --ignore-scripts
npm run build
npm run dev
```

Abra http://127.0.0.1:4173. Para usar banco real localmente, copie `.env.example` para `.env`, configure a conexão e execute `npm run db:migrate`.

```bash
npm run check
npm test
npx playwright install chromium
npm run test:e2e
```

Os testes de servidor usam PostgreSQL embutido (PGlite); os testes de navegador percorrem convidado local, cadastro, login, perfil, transferência, persistência e separação entre contas. Não exigem banco remoto ou credenciais reais. O GitHub Actions executa essas verificações.

## Estrutura

```text
api/index.js           Função da Vercel que atende /api/*
server/                Autenticação, sessões e acesso ao PostgreSQL
src/core.js            Regras, validação, sorteio e estatísticas
public/                Interface, carregador e armazenamento local do convidado
migrations/            Esquema PostgreSQL versionado
scripts/               Build, migração e servidor de desenvolvimento
tests/                 Regras, PostgreSQL e navegador
docs/VERCEL.md         Configuração de deploy e conexão do banco
docs/DATABASE.md       Dados, autenticação e integridade
```

## Dados da instalação anterior

A instalação anterior e seu banco externo não foram alterados por esta migração de código. Caso tenha registros lá, exporte os backups JSON de cada pelada e restaure-os nesta versão, dentro da conta desejada. Não há migração automática de contas do provedor antigo; crie um cadastro por e-mail nesta instalação. O código antigo permanece no histórico Git.

Senhas e credenciais do banco não vão para o código do navegador. O sistema ainda não oferece recuperação automática de senha por e-mail nem verificação por SMS/e-mail. [Detalhes do banco](docs/DATABASE.md).
