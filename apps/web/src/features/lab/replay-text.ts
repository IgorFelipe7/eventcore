import { type LabReplay } from '@eventcore/contracts'
import { type Locale } from '@/i18n/locales'

type Rule = readonly [RegExp, (...groups: string[]) => string]

const plural = (value: string, singular: string, plural: string) =>
  value === '1' ? singular : plural

const PT_RULES: readonly Rule[] = [
  [/^Two people, one seat$/, () => 'Duas pessoas, um lugar'],
  [/^One hundred people, ten seats$/, () => 'Cem pessoas, dez vagas'],
  [/^Ten clicks, one intent$/, () => 'Dez cliques, uma intenção'],
  [/^The answer that never arrived$/, () => 'A resposta que nunca chegou'],
  [/^Ten leave, twenty arrive$/, () => 'Dez saem, vinte chegam'],
  [/^Moving the walls during the rush$/, () => 'Mudando as paredes no meio da corrida'],
  [/^An admin of the wrong organization$/, () => 'Um admin da organização errada'],
  [/^The email provider is down$/, () => 'O provedor de e-mail caiu'],

  [
    /^When two requests reach the last seat at the same moment, does exactly one get it\?$/,
    () => 'Quando duas requisições chegam ao último lugar no mesmo instante, exatamente uma leva?',
  ],
  [
    /^Under a burst of (\d+) concurrent registrations for (\d+) seats, how many are confirmed\?$/,
    (requests, seats) =>
      `Sob uma rajada de ${requests} inscrições simultâneas para ${seats} vagas, quantas são confirmadas?`,
  ],
  [
    /^If the same request is sent ten times at once with one idempotency key, how many effects happen\?$/,
    () =>
      'Se a mesma requisição é enviada dez vezes de uma vez com uma só chave de idempotência, quantos efeitos acontecem?',
  ],
  [
    /^If the server commits but the client never hears back, what does the retry get\?$/,
    () => 'Se o servidor grava mas o cliente nunca recebe a resposta, o que a retentativa recebe?',
  ],
  [
    /^When seats are released while newcomers keep arriving, who gets them\?$/,
    () =>
      'Quando vagas são liberadas enquanto novas pessoas continuam chegando, quem fica com elas?',
  ],
  [
    /^If an admin changes capacity five times while (\d+) people register, does anything break\?$/,
    (people) =>
      `Se um admin muda a capacidade cinco vezes enquanto ${people} pessoas se inscrevem, alguma coisa quebra?`,
  ],
  [
    /^Can an admin of one organization read or change another organization’s event\?$/,
    () => 'Um admin de uma organização consegue ler ou alterar o evento de outra?',
  ],
  [
    /^If notifications can’t be delivered, are registrations lost, delayed or duplicated\?$/,
    () =>
      'Se as notificações não podem ser entregues, as inscrições se perdem, atrasam ou duplicam?',
  ],

  [
    /^Capacity 1, waitlist on\. Two participants send their registration concurrently, then the same race is repeated on (\d+) fresh events\.$/,
    (rounds) =>
      `Capacidade 1, lista de espera ligada. Dois participantes enviam a inscrição ao mesmo tempo, e a mesma disputa se repete em ${rounds} eventos novos.`,
  ],
  [
    /^Capacity (\d+), waitlist on, (\d+) distinct participants sent concurrently\. The baseline runs the same load through a check-then-insert implementation with no lock, directly against the same database\.$/,
    (capacity, participants) =>
      `Capacidade ${capacity}, lista de espera ligada, ${participants} participantes distintos enviados ao mesmo tempo. O baseline roda a mesma carga em uma implementação que verifica e depois insere, sem lock, direto no mesmo banco.`,
  ],
  [
    /^Capacity (\d+)\. One participant fires ten identical requests concurrently with the same Idempotency-Key\.$/,
    (capacity) =>
      `Capacidade ${capacity}. Um participante dispara dez requisições idênticas ao mesmo tempo com a mesma Idempotency-Key.`,
  ],
  [
    /^Capacity 1\. A registers and the client pretends it lost the response; B takes the queue spot; A retries with the same key\.$/,
    () =>
      'Capacidade 1. A se inscreve e o cliente finge ter perdido a resposta; B fica com o lugar na fila; A tenta de novo com a mesma chave.',
  ],
  [
    /^Capacity (\d+), all taken, (\d+) already queued in a known order\. Ten holders cancel while (\d+) newcomers register, all concurrently\.$/,
    (capacity, queued, newcomers) =>
      `Capacidade ${capacity}, todas ocupadas, ${queued} já na fila em ordem conhecida. Dez titulares cancelam enquanto ${newcomers} novas pessoas se inscrevem, tudo ao mesmo tempo.`,
  ],
  [
    /^Capacity starts at (\d+)\. Sixty registrations and five capacity changes \(([\d, ]+)\) run concurrently\.$/,
    (capacity, changes) =>
      `A capacidade começa em ${capacity}. Sessenta inscrições e cinco mudanças de capacidade (${changes}) rodam ao mesmo tempo.`,
  ],
  [
    /^Two organizations\. Their admin is authenticated and valid — just for the other organization\. Six probes, read and write\.$/,
    () =>
      'Duas organizações. O admin delas está autenticado e é válido, só que para a outra organização. Seis sondagens, de leitura e escrita.',
  ],
  [
    /^Four registrations commit while the notification provider refuses connections\. The relay retries, the provider comes back, and the relay runs once more\.$/,
    () =>
      'Quatro inscrições são gravadas enquanto o provedor de notificações recusa conexões. O relay tenta de novo, o provedor volta, e o relay roda mais uma vez.',
  ],

  [
    /^Two requests is the smallest possible race; it proves correctness, not throughput\.$/,
    () => 'Duas requisições são a menor disputa possível; isso prova correção, e não vazão.',
  ],
  [
    /^Both requests share one Node\.js process and one connection pool\.$/,
    () => 'As duas requisições dividem um processo Node.js e um pool de conexões.',
  ],
  [
    /^The baseline bypasses HTTP, so its timings are not comparable with the locked run — only its outcome is\.$/,
    () =>
      'O baseline não passa pelo HTTP, então seus tempos não se comparam com a execução com lock; só o resultado se compara.',
  ],
  [
    /^Latency is measured by the caller and includes waiting for the pool and for the inventory lock\.$/,
    () => 'A latência é medida por quem chama e inclui a espera pelo pool e pelo lock de estoque.',
  ],
  [
    /^One machine, one database, one event\. This says nothing about throughput across many events\.$/,
    () => 'Uma máquina, um banco, um evento. Isso não diz nada sobre a vazão com muitos eventos.',
  ],
  [
    /^The replays wait on the unique index until the first transaction commits; that wait is part of their latency\.$/,
    () =>
      'Os replays esperam no índice único até a primeira transação gravar; essa espera faz parte da latência deles.',
  ],
  [
    /^The lost response is simulated by ignoring it; no network failure is injected\.$/,
    () => 'A resposta perdida é simulada ignorando-a; nenhuma falha de rede é injetada.',
  ],
  [
    /^The queue was built sequentially before the race so that its order is known in advance\.$/,
    () => 'A fila foi montada em sequência antes da disputa, para que a ordem fosse conhecida.',
  ],
  [
    /^Which capacity wins depends on lock order, which is not deterministic; the invariants hold either way\.$/,
    () =>
      'Qual capacidade vence depende da ordem dos locks, que não é determinística; os invariantes valem de qualquer forma.',
  ],
  [
    /^Probes are sequential; tenancy is a property of each request, not of concurrency\.$/,
    () =>
      'As sondagens são sequenciais; o isolamento entre clientes é propriedade de cada requisição, e não da concorrência.',
  ],
  [
    /^The outage is a sink that refuses every delivery; the backoff is set to zero so the run takes seconds, not minutes\.$/,
    () =>
      'A pane é um destino que recusa toda entrega; o backoff fica em zero para a execução levar segundos, e não minutos.',
  ],

  [
    /^In-process HTTP injection into the real Fastify app \(no network hop\)$/,
    () => 'Injeção HTTP no próprio processo da aplicação Fastify real (sem salto de rede)',
  ],
  [/^Naive baseline$/, () => 'Baseline ingênuo'],
  [/^EventCore$/, () => 'EventCore'],

  [
    /^One request confirms, the other is first in line — in every one of the (\d+) races\.$/,
    (races) =>
      `Uma requisição confirma e a outra vira a primeira da fila, em todas as ${races} disputas.`,
  ],
  [
    /^Read the count, then insert: (\d+) people confirmed for (\d+) seats\.$/,
    (people, seats) =>
      `Lê a contagem e depois insere: ${people} pessoas confirmadas para ${seats} vagas.`,
  ],
  [
    /^(\d+) confirmed, (\d+) waitlisted in a gapless order\.$/,
    (confirmed, waiting) => `${confirmed} confirmadas, ${waiting} na fila em ordem contínua.`,
  ],
  [
    /^One decision, (\d+) replays of it, (\d+) distinct answer\.$/,
    (replays, answers) =>
      `Uma decisão, ${replays} replays dela, ${answers} ${plural(answers, 'resposta distinta', 'respostas distintas')}.`,
  ],
  [
    /^The retry is answered from the stored response: the original confirmation, not a new decision\.$/,
    () =>
      'A retentativa é respondida com a resposta guardada: a confirmação original, sem nova decisão.',
  ],
  [
    /^The first (\d+) in line were promoted; (\d+) newcomers overtook the queue\.$/,
    (first, overtook) =>
      `As ${first} primeiras da fila foram promovidas; ${overtook} recém-chegadas passaram na frente.`,
  ],
  [
    /^Final capacity (\d+): (\d+) confirmed, (\d+) waiting\. Changes that would cut below confirmed seats were refused\.$/,
    (capacity, confirmed, waiting) =>
      `Capacidade final ${capacity}: ${confirmed} confirmadas, ${waiting} na fila. Mudanças que cortariam abaixo das vagas confirmadas foram recusadas.`,
  ],
  [
    /^Every probe was refused: 403 on their routes, 404 when their event was reached through our path\.$/,
    () =>
      'Todas as sondagens foram recusadas: 403 nas rotas deles, 404 quando o evento deles foi buscado pelo nosso caminho.',
  ],
  [
    /^All (\d+) registrations committed during the outage; (\d+) notifications delivered after recovery, none twice\.$/,
    (registrations, delivered) =>
      `As ${registrations} inscrições foram gravadas durante a pane; ${delivered} notificações entregues após a volta, nenhuma duas vezes.`,
  ],

  [/^Confirmed seats within capacity$/, () => 'Vagas confirmadas dentro da capacidade'],
  [/^Counter equals confirmed rows$/, () => 'Contador igual às linhas confirmadas'],
  [/^One registration per participant$/, () => 'Uma inscrição por participante'],
  [/^No idle seat while someone waits$/, () => 'Nenhuma vaga ociosa com gente esperando'],
  [/^Repeated races$/, () => 'Disputas repetidas'],
  [/^Identical answers$/, () => 'Respostas idênticas'],
  [/^Retry replays the original$/, () => 'A retentativa repete a original'],
  [/^Promotion is first in, first out$/, () => 'Promoção por ordem de chegada'],
  [/^Newcomers wait behind the queue$/, () => 'Recém-chegados esperam atrás da fila'],
  [/^Every probe refused$/, () => 'Todas as sondagens recusadas'],
  [/^Their data unchanged$/, () => 'Os dados deles intactos'],
  [/^Exactly one notification per change$/, () => 'Exatamente uma notificação por mudança'],
  [/^Nothing lost during the outage$/, () => 'Nada perdido durante a pane'],

  [
    /^(\d+) confirmed for (\d+) seats?$/,
    (confirmed, seats) =>
      `${confirmed} confirmadas para ${seats} ${plural(seats, 'vaga', 'vagas')}`,
  ],
  [/^counter (\d+), rows (\d+)$/, (counter, rows) => `contador ${counter}, linhas ${rows}`],
  [
    /^(\d+) participants with more than one row$/,
    (value) => `${value} participantes com mais de uma linha`,
  ],
  [
    /^(\d+) waiting, (\d+) seats? idle$/,
    (waiting, idle) =>
      `${waiting} na fila, ${idle} ${plural(idle, 'vaga ociosa', 'vagas ociosas')}`,
  ],
  [
    /^(\d+) waiting, no idle seat \(overbooked by (\d+)\)$/,
    (waiting, over) => `${waiting} na fila, nenhuma vaga ociosa (${over} acima da capacidade)`,
  ],
  [
    /^(\d+) of (\d+) extra rounds ended with exactly one confirmation$/,
    (done, total) => `${done} de ${total} rodadas extras terminaram com exatamente uma confirmação`,
  ],
  [
    /^(\d+) distinct response bodies across (\d+) requests$/,
    (bodies, requests) =>
      `${bodies} ${plural(bodies, 'corpo de resposta distinto', 'corpos de resposta distintos')} em ${requests} requisições`,
  ],
  [
    /^Byte-identical body, Idempotent-Replayed: true$/,
    () => 'Corpo idêntico byte a byte, Idempotent-Replayed: true',
  ],
  [
    /^(\d+) of the first (\d+) queued were promoted$/,
    (promoted, first) => `${promoted} das ${first} primeiras da fila foram promovidas`,
  ],
  [/^(\d+) newcomers confirmed directly$/, (value) => `${value} recém-chegados confirmados direto`],
  [/^(\d+) of (\d+) refused$/, (refused, total) => `${refused} de ${total} recusadas`],
  [/^Venue and status exactly as before$/, () => 'Local e status exatamente como antes'],
  [
    /^(\d+) deliveries for (\d+) committed changes; the extra relay run claimed (\d+)$/,
    (deliveries, changes, claimed) =>
      `${deliveries} entregas para ${changes} mudanças gravadas; a rodada extra do relay pegou ${claimed}`,
  ],
  [
    /^(\d+) events scheduled for retry, (\d+) dead-lettered$/,
    (retry, dead) => `${retry} eventos agendados para nova tentativa, ${dead} na dead-letter`,
  ],

  [/^List their events$/, () => 'Listar os eventos deles'],
  [/^List their attendees$/, () => 'Listar os participantes deles'],
  [/^Read their audit trail$/, () => 'Ler a auditoria deles'],
  [/^Rename their venue$/, () => 'Renomear o local deles'],
  [/^Cancel their event$/, () => 'Cancelar o evento deles'],
  [/^Their event through our path$/, () => 'O evento deles pelo nosso caminho'],
  [/^A · response lost$/, () => 'A · resposta perdida'],
  [/^A · retry, same key$/, () => 'A · retentativa, mesma chave'],
  [/^click (\d+)$/, (index) => `clique ${index}`],
  [/^admin → (\d+)$/, (capacity) => `admin → ${capacity}`],
  [/^relay · provider down$/, () => 'relay · provedor fora'],
  [/^relay · provider back$/, () => 'relay · provedor de volta'],
  [/^relay · run again$/, () => 'relay · roda de novo'],
]

const PASS_THROUGH = /^(?:[A-Z]|[PHN]\d+|\d+ [A-Z_]+|[A-Z_]+(?: #?\d+)?)$/

export interface Translation {
  readonly text: string
  readonly translated: boolean
}

export const translateReplayText = (text: string): Translation => {
  for (const [pattern, render] of PT_RULES) {
    const match = pattern.exec(text)
    if (match) return { text: render(...match.slice(1)), translated: true }
  }
  return { text, translated: PASS_THROUGH.test(text) }
}

const pt = (text: string) => translateReplayText(text).text

export const localizeReplay = (replay: LabReplay, locale: Locale): LabReplay => {
  if (locale === 'en') return replay
  return {
    ...replay,
    title: pt(replay.title),
    question: pt(replay.question),
    setup: pt(replay.setup),
    limits: replay.limits.map(pt),
    environment: { ...replay.environment, transport: pt(replay.environment.transport) },
    variants: replay.variants.map((variant) => ({
      ...variant,
      label: pt(variant.label),
      summary: pt(variant.summary),
      attempts: variant.attempts.map((attempt) => ({ ...attempt, actor: pt(attempt.actor) })),
      checks: variant.checks.map((check) => ({
        ...check,
        label: pt(check.label),
        detail: pt(check.detail),
      })),
    })),
  }
}

export const untranslatedReplayText = (replay: LabReplay): string[] => {
  const texts = [
    replay.title,
    replay.question,
    replay.setup,
    replay.environment.transport,
    ...replay.limits,
    ...replay.variants.flatMap((variant) => [
      variant.label,
      variant.summary,
      ...variant.attempts.map((attempt) => attempt.actor),
      ...variant.checks.flatMap((check) => [check.label, check.detail]),
    ]),
  ]
  return [...new Set(texts)].filter((text) => !translateReplayText(text).translated)
}
