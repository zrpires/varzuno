# Várzuno

Aplicativo de organização de peladas com **cadastro de perfil, login com ChatGPT, modo convidado e várias peladas independentes por conta**.

**Aplicativo:** https://varzuno.joseraffael2003.chatgpt.site

## Conta e acesso

- **Entrar / criar conta com ChatGPT:** autenticação gerenciada pelo Sites. No primeiro acesso, o usuário escolhe nome/apelido e conclui o cadastro de perfil. O Várzuno não recebe nem armazena senhas.
- **Entrar como convidado:** não exige cadastro. Cria uma sessão protegida neste navegador, válida por 30 dias, com até 5 peladas.
- **Conta conectada:** até 50 peladas, com registros associados ao usuário e acessíveis ao entrar em outro dispositivo.
- **Transferir para minha conta:** após o login, permite trazer as peladas da sessão convidada deste navegador, sem misturar registros nem duplicar estatísticas.
- **Sair:** revoga o acesso de convidado; para conta ChatGPT, utiliza o fluxo de saída do provedor.

A página de entrada pode ser acessível a visitantes, mas os dados são privados por conta. Saber a URL ou o identificador de uma pelada não autoriza consultar ou editar seus registros.

O convidado depende do cookie deste navegador. Sair, apagar cookies ou deixar a sessão expirar remove o acesso; não há recuperação por senha nesse modo. Antes disso, transfira as peladas para uma conta ou exporte backups. Cada backup é de uma pelada; restaurá-lo não altera as demais.

## Organização das peladas

A tela **Minhas peladas** permite criar, abrir e excluir turmas independentes. Dentro de cada uma:

- Atletas com posição e overall de 1 a 99; arquivamento preserva histórico.
- Sorteio equilibrado de 2 a 4 times, goleiros distribuídos e trocas manuais.
- Registro e correção de partidas com presenças, gols, assistências e notas de 0 a 10.
- Rankings por overall, artilharia, assistências, participações, média e pontos.
- Filtros de período, backup JSON, exportação CSV e cópia dos times para compartilhar.

Participação é partida efetivamente disputada. A média usa somente notas preenchidas; zero é uma nota válida. O overall é manual e independente das avaliações. Pontos: 3 por vitória e 1 por empate, somente para quem jogou. O sorteio é uma heurística e não promete uma solução matematicamente ótima.

A seção de configurações atua apenas na pelada selecionada. Limpar seus dados ou restaurar seu backup não afeta as outras turmas da conta. Excluir uma pelada exige confirmação e a revisão atual de seus registros.

## Dados da versão anterior

Registros da versão 1 foram preservados na tabela original. Após login e cadastro, o proprietário pode importá-los por um botão específico. A migração é explícita, pode ser retomada e não apaga a cópia original.

## Banco de dados

Cloudflare D1 (SQLite) com 12 tabelas, chaves estrangeiras, índices e migrações Drizzle. Contas, sessões, peladas, atletas, sorteios, times, partidas e atuações têm tabelas próprias. A atualização de uma pelada usa transação e revisão para evitar sobrescritas entre abas/dispositivos.

Veja o [modelo do banco, relacionamentos, sessões e migração](docs/DATABASE.md).

## Desenvolvimento e testes

Node.js 22.13+ e npm. Sem dependências de runtime no Worker.

```bash
npm ci
npm run check
npm test
npm run build
```

Os testes geram o artefato e usam SQLite real em memória. Cobrem sorteio, estatísticas, login/cadastro, cookies, expiração, isolamento entre contas, várias peladas, revisão concorrente, rollback, transferência do convidado e migração antiga. O GitHub Actions executa as verificações a cada push/pull request.

A revisão de navegador gerenciado continua indisponível neste ambiente. Os testes automatizados não substituem a verificação final do fluxo de login nos navegadores dos usuários.

## Publicação e portabilidade

A instalação atual utiliza **Sites + Cloudflare D1 + login ChatGPT do Sites**. O repositório contém o código, o esquema e as migrações, sem credenciais, tokens de sessão ou dados reais de usuários. O identificador em `.openai/hosting.json` é a identidade do aplicativo existente; não o substitua ao atualizar esta instalação.

Publique pelo fluxo Sites, com o Worker ESM de `dist/server/index.js`, o manifesto e as migrações SQL. Aplique novas migrações pelo processo de publicação; nunca crie/alterne tabelas durante requisições. Preserve as migrações e metadados já aplicados.

**Não é um deploy direto na Vercel:** D1 e os cabeçalhos de identidade são fornecidos pelo Sites. Em outro provedor, seria necessário adaptar o banco e usar um provedor de autenticação confiável. Não aceite cabeçalhos de identidade enviados diretamente por visitantes em uma instalação independente.

## Estrutura

```text
src/core.js         Regras, validação, sorteio e estatísticas
src/http.js         HTTP, validação de requisições e segurança
src/auth.js         Perfis, sessões convidadas e autenticação Sites
src/database.js     Leitura/gravação normalizada e permissões por pelada
src/worker.js       Rotas e entrega do aplicativo
public/             Interface web
scripts/            Build e verificação de sintaxe
drizzle/            Esquema, migrações e metadados imutáveis
tests/              Regras e integração sobre SQLite real
docs/DATABASE.md    Modelo e operação do banco
```
