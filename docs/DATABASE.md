# Banco PostgreSQL do Várzuno

O servidor da Vercel acessa o Neon usando `DATABASE_URL` ou `POSTGRES_URL`, sem expor credenciais ao navegador. Os dados de contas ficam no esquema `varzuno`.

| Tabela | Uso |
| --- | --- |
| `accounts` | Nome, e-mail único normalizado, telefone, posição, hash da senha e data de cadastro. |
| `sessions` | Hash de token aleatório, proprietário e expiração; tokens brutos ficam somente em cookie HttpOnly. |
| `auth_limits` | Contadores de tentativas por janela, sem armazenar IP/e-mail em texto como chave. |
| `leagues` | Peladas, proprietário, revisão e token exclusivo de cada operação de gravação. |
| `athletes` | Atletas de cada pelada, posição e overall. |
| `matches` | Confrontos, datas, locais, observações e gols sem autoria. |
| `match_teams` | Times e nomes no momento de cada partida. |
| `performances` | Presenças, gols, assistências, notas e identificação histórica do atleta. |
| `draws` | Sorteio atual da pelada. |
| `draw_teams` | Equipes sorteadas. |
| `draw_players` | Jogadores e ordem das equipes sorteadas. |
| `schema_migrations` | Migrações aplicadas. |

## Autenticação e permissões

Senhas usam scrypt com salt aleatório, `N=32768`, `r=8`, `p=3` e comparação em tempo constante. As sessões usam tokens aleatórios de 256 bits e armazenam somente SHA-256 no banco. O cookie de produção é `__Host-varzuno-session`, com `HttpOnly`, `Secure`, `SameSite=Lax` e validade de 30 dias. Sair revoga a sessão no servidor.

A identidade vem exclusivamente dessa sessão. Cabeçalhos do antigo provedor e identificadores de proprietário enviados pelo navegador não autorizam acesso. Leitura, atualização e exclusão exigem o proprietário correto. As consultas usam parâmetros.

O app não envia confirmação por e-mail/SMS e ainda não oferece recuperação automática de senha por e-mail. Não apresenta telefone/e-mail como verificados.

## Integridade

As chaves estrangeiras compostas impedem usar atletas de outra pelada em uma atuação. Excluir uma pelada remove apenas seus registros filhos, sem afetar outras turmas. Backups podem ser importados em peladas distintas sem colisões de atletas/partidas.

O salvamento usa transação e exige a revisão esperada. As instruções de gravação/deleção de filhos também exigem o token exclusivo da mesma operação. Uma revisão antiga não apaga dados. Falhas revertem a transação inteira. Os rankings são derivados das atuações, sem contadores incrementais duplicados ao editar uma partida.

## Migrações

`migrations/001_initial.sql` cria somente o esquema `varzuno`, sem apagar outros esquemas do banco. O build aplica migrações pendentes dentro de transação e lock. Não há criação de tabelas durante requisições normais. Execute manualmente com `npm run db:migrate`, usando a conexão somente no servidor.

Os testes usam PostgreSQL embutido (PGlite), com SQL, constraints e transações reais. A conexão final ao Neon depende da variável no ambiente Vercel e deve ser verificada em `/api/health`.

## Convidado local

Convidados não criam conta no PostgreSQL. Até 5 peladas ficam no armazenamento deste navegador, sem proteção por senha nem sincronização entre dispositivos. Sair encerra o modo, mas não apaga essas peladas; a entrada como convidado permite retomá-las neste mesmo navegador. Apagar dados do site remove os registros locais.

Após cadastrar/entrar em uma conta, o usuário pode transferir as peladas locais para a nuvem. Cada cópia local só é removida após confirmação da gravação correspondente. Uma transferência interrompida pode ser retomada sem sobrescrever alterações de uma cópia na nuvem. Exporte backups regularmente.
