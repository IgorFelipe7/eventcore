# EventCore

**Duas requisições. Um lugar. Exatamente uma confirmação.**

[English](README.md)

**Demo ao vivo:** <https://eventcore-igor.vercel.app/pt-br> · **Referência da API:** <https://eventcore-api.vercel.app/docs>

O EventCore é um motor de reservas para eventos com vagas limitadas. Cada decisão de um evento é serializada em uma única linha do PostgreSQL, então a capacidade se mantém sob carga concorrente, retentativas nunca reservam duas vezes, a lista de espera preserva a ordem e uma organização nunca enxerga os dados de outra. Cada uma dessas afirmações tem um teste que roda contra um banco de dados real e uma execução gravada que você pode reproduzir no navegador, em português ou em inglês.

![A sala: a requisição A segura o lock do último lugar enquanto B espera](docs/media/hero.png)

## O resultado, gravado

Mesma carga, mesmo banco, duas implementações. 100 inscrições simultâneas para 10 vagas:

| Implementação | Confirmadas | Na fila | Verificações de invariantes |
|---|---|---|---|
| Ingênua, verifica e depois insere, sem lock | **90 para 10 vagas** | 0 | capacidade ✗ · contador ✗ |
| EventCore | **10** | 90, posições 1 a 90 sem lacunas | todas passam |

![A seção de prova: contadores e as 100 requisições gravadas acendendo na ordem em que o banco decidiu](docs/media/proof.png)

Os demais cenários gravados, todos passando em todas as verificações de invariantes:

| # | Cenário | Resultado |
|---|---|---|
| 01 | Duas pessoas, um lugar, e mais 30 rodadas | Uma confirmada e uma primeira da fila, nas 31 disputas |
| 03 | Dez cliques idênticos com uma só chave de idempotência | Uma decisão, nove replays, uma resposta distinta |
| 04 | O servidor grava, o cliente nunca recebe a resposta e tenta de novo | A retentativa recebe a confirmação original, byte a byte |
| 05 | Dez cancelamentos disputam com vinte recém-chegados | As dez primeiras da fila foram promovidas; ninguém passou na frente |
| 06 | Cinco mudanças de capacidade durante uma corrida de 60 pessoas | Contador, linhas e fila consistentes; cortes abaixo das vagas confirmadas recusados |
| 07 | Um admin da organização errada sonda seis rotas | Todas recusadas: 403 nas rotas deles, 404 pelas nossas; nada mudou |
| 08 | O provedor de notificações está fora do ar | Todas as inscrições mantidas; quatro notificações entregues após a volta, nenhuma duas vezes |

Gravado em 07/10/2026 no commit `321bed4` com `pnpm lab:record`: PostgreSQL 18.6, Node.js 24.12, Intel Core i5-10400, a aplicação Fastify real exercitada no próprio processo (sem salto de rede), 40 conexões no pool. O p95 medido por quem chama no pico de 100 requisições com lock foi de 931 ms, porque as 100 esperam por um único lock de linha e um único pool. É uma medição de uma máquina, não um número de produção, e nenhuma afirmação de vazão é feita neste repositório. A contagem ingênua varia entre execuções; nunca deu 10.

## Como rodar

Requer Node.js 24, pnpm e Docker.

```bash
cp .env.example .env        # defina AUTH_DEMO_SECRET com 32+ caracteres aleatórios
pnpm install
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm dev                    # web em :3000, API em :4000, worker
```

Abra <http://localhost:3000/pt-br>, escolha uma persona demo em **Atuando como** e dispute *The Last Seat*. O Swagger UI fica em <http://localhost:4000/docs>.

```bash
pnpm test                   # 122 testes em 21 arquivos, contra um PostgreSQL 18 descartável
pnpm test:e2e               # 11 testes Playwright: jornadas, axe WCAG 2.2 AA, 360 px, teclado
pnpm lab:record             # regrava o Lab; falha se um cenário seguro quebrar um invariante
```

## Como funciona

```
requisição ─ verifica token ─ resolve associação ─ valida
           └─ BEGIN
              ├─ reserva a chave de idempotência   INSERT … ON CONFLICT DO NOTHING
              ├─ trava event_inventory             SELECT … FOR UPDATE
              ├─ relê regras, linha e fila         sob o lock
              ├─ decide                            função pura de domínio
              ├─ grava linha, contador, histórico, auditoria, evento de outbox
              └─ guarda a resposta na chave ─ COMMIT
           └─ o worker repassa o outbox, pelo menos uma vez, sem duplicar
```

![O passo a passo do mecanismo: o passo em foco destaca suas linhas de SQL](docs/media/mechanism.png)

| Decisão | Por quê | Registro |
|---|---|---|
| Monolito modular | A regra difícil é uma decisão síncrona; dividi-la transformaria uma transação em um protocolo. | [ADR 0001](docs/adr/0001-modular-monolith.md) |
| Lock de linha em `event_inventory` sob `READ COMMITTED` | Expressa "existe fila, então quem chega espera" de forma atômica; sem tempestade de retentativas; ordem de chegada mantida. `SKIP LOCKED` só no outbox. | [ADR 0002](docs/adr/0002-postgres-capacity-lock.md) |
| Chave de idempotência gravada com o efeito | Uma duplicata concorrente espera no índice único e lê a resposta gravada; não há nada para consultar depois. | [ADR 0003](docs/adr/0003-idempotency-contract.md) |
| Outbox transacional | A notificação só existe se a mudança existir; a entrega é repetida e sem duplicidade. | [ADR 0004](docs/adr/0004-transactional-outbox.md) |

Os oito invariantes (I1 a I8), cada um com a camada que o impõe e o teste que tenta quebrá-lo, estão em [`docs/00-vision.md`](docs/00-vision.md) e na página inicial.

## A experiência web

O site abre dentro de uma pequena sala renderizada com three.js: 24 lugares desenhados como um modelo de linhas ocultas, um único lugar livre e brilhando, e duas requisições disputando por ele enquanto você rola a página. O lock se fecha em volta do lugar como uma caixa de seleção de CAD, uma requisição é confirmada e a outra vai para a fila. Tudo depois da sala continua na mesma luz: superfícies de vidro, Mona Sans em larguras expandidas, uma palavra em destaque por título e movimento só onde um fato gravado pode ser reproduzido. Um passo a passo fixo destaca o SQL de cada etapa da transação, as 100 requisições gravadas acendem na ordem em que o banco decidiu e o Lab reproduz cada execução com seus tempos.

| | |
|---|---|
| ![A Fig. 1 roda o algoritmo passo a passo sozinha](docs/media/last-seat.png) | ![O Laboratório em português, baseline ingênuo ao lado do EventCore](docs/media/lab-pt-br.png) |

A pesquisa por trás do design (CSS medido de Linear, Raycast, Resend, Basement, Clerk, Lusion e vencedores anteriores do Awwwards), o conceito e o design system estão em [`docs/experience`](docs/experience) e em [`DESIGN.md`](DESIGN.md). No build de produção a página inicial inteira rola a 142,6 fps em uma tela de 144 Hz sem nenhum quadro acima de 33 ms e, com a CPU 4× mais lenta, mantém o p99 abaixo de 28 ms; o Lighthouse marca 100 em acessibilidade, boas práticas e SEO. Cada medição e cada defeito encontrado no caminho estão em [`docs/experience/09-validation.md`](docs/experience/09-validation.md).

<img src="docs/media/mobile-pt-br.png" alt="A sala em um celular, em português" width="300" />

## Dois idiomas

O inglês é servido na raiz e o português do Brasil em `/pt-br`, a partir das mesmas rotas. O dicionário em português é tipado contra o inglês, as frases gravadas do Lab são traduzidas por padrão para que os números medidos sobrevivam a uma nova gravação, e testes mantêm os dois em sincronia. Veja [`docs/localization.md`](docs/localization.md) (em inglês).

## Repositório

```
apps/
  api/        Fastify 5 · serviços de aplicação, adaptadores HTTP, problem details, métricas
  worker/     Relay do outbox, backoff, dead letters, varredura de integridade
  web/        Next.js 16 · React 19 · Tailwind 4 · three.js · a sala, o Lab, en e pt-BR
packages/
  domain/     Regras e tabelas de transição, sem framework, ORM ou driver
  contracts/  Schemas Zod compartilhados por API, web e o gravador do Lab
  db/         Schema Drizzle, migrações SQL revisadas, repositórios com SQL explícito
  auth/       Verificação de JWT e assinatura de tokens demo
tests/        Integração, concorrência, segurança, resiliência, e2e, gravador do Lab, script k6
docs/         Visão, ADRs, máquina de estados, modelo de dados, ameaças, runbooks, localização, experiência
infra/        Docker Compose e as imagens da API e do worker
```

## Limites conhecidos

- Um evento muito disputado é serializado em um único lock de linha. Esse limite é proposital, mensurável e documentado.
- O rate limit é por processo até que um armazenamento compartilhado seja configurado.
- O Lab reproduz execuções gravadas em uma máquina; ele nunca envia tráfego.
- A demo pública roda a API como Vercel Functions, então o rate limit e o `/metrics` são por instância, e o worker esvazia o outbox quatro vezes por hora por um workflow agendado, em vez de continuamente ([ADR 0005](docs/adr/0005-public-demo-on-serverless.md)).
- O script de carga k6 em [`tests/load`](tests/load) não foi executado contra um ambiente implantado, então não há resultados de carga para relatar.

## Documentação

A documentação técnica está em inglês: [Visão](docs/00-vision.md) · [Máquina de estados](docs/domain-state-machine.md) · [Modelo de dados](docs/data-model.md) · [Contrato da API](docs/api-contract.md) · [Modelo de ameaças](docs/threat-model.md) · [Metodologia de testes](docs/testing-methodology.md) · [Runbooks](docs/runbooks.md) · [Deploy](docs/deployment.md) · [Localização](docs/localization.md) · [Design system](DESIGN.md) · [Contribuição](CONTRIBUTING.md) · [Segurança](SECURITY.md) · [Changelog](CHANGELOG.md)

## Licença

[MIT](LICENSE) © 2026 Igor Felipe
