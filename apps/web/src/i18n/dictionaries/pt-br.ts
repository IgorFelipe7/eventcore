import { type Dictionary } from './en'

const count = (value: number, singular: string, plural = `${singular}s`) =>
  `${value.toLocaleString('pt-BR')} ${value === 1 ? singular : plural}`

export const ptBR: Dictionary = {
  meta: {
    title: 'EventCore · o último lugar, decidido uma única vez',
    description:
      'Um motor de reservas para eventos com capacidade limitada. Serializado em uma única linha do banco, idempotente em retentativas e justo com a lista de espera, com testes e execuções gravadas que provam cada afirmação.',
    social: 'Duas requisições. Um lugar. Exatamente uma confirmação.',
    errorTitle: 'Algo quebrou · EventCore',
  },

  common: {
    skipToContent: 'Pular para o conteúdo',
    sheet: 'Prancha',
    of: 'de',
    rev: 'Rev',
    figure: 'Fig.',
    figureKinds: { illustrative: 'ilustrativa', measured: 'medida', schematic: 'esquemática' },
    scrollableCode: (name: string) => `Código ${name}, rolável`,
    terminal: 'Terminal',
    passes: 'passa',
    fails: 'falha',
    request: 'requisição',
    back: 'Voltar',
    titleBlock: {
      label: 'Carimbo',
      project: 'Projeto',
      sheetTitle: 'Título da prancha',
      sheet: 'Prancha',
      rev: 'Rev',
      date: 'Data',
      drawnBy: 'Desenhado por',
    },
    seats: (value: number) => count(value, 'vaga'),
  },

  sheets: {
    landing: 'O último lugar',
    board: 'Quadro de eventos',
    registrations: 'Minhas inscrições',
    lab: 'Laboratório de confiabilidade',
    dashboard: 'Painel do organizador',
    eventPanel: 'Painel do evento',
    newEvent: 'Novo evento em rascunho',
    architecture: 'Arquitetura',
    api: 'Referência da API',
    notFound: 'Não encontrada',
    event: 'Evento',
  },

  nav: {
    primary: 'Principal',
    compact: 'Principal, compacta',
    board: 'Quadro',
    lab: 'Lab',
    architecture: 'Arquitetura',
    api: 'API',
    dashboard: 'Painel',
    myRegistrations: 'Minhas inscrições',
    language: 'Idioma',
  },

  persona: {
    actingAs: 'Atuando como',
    nobody: 'Ninguém',
    readOnly: 'Demo somente leitura',
    intro:
      'Apenas personas de demonstração. Sem conta e sem dados pessoais: escolher uma assina um token de curta duração no servidor.',
    participants: 'Participantes',
    organizers: 'Organizadores',
    active: 'Ativa',
    stop: 'Parar de atuar',
    roles: {
      'demo|participant-rio': 'participante demo',
      'demo|participant-sol': 'participante demo',
      'demo|participant-ivo': 'participante demo',
      'demo|organizer-mara': 'admin da Northwind',
      'demo|organizer-teo': 'organizador da Northwind',
      'demo|organizer-lis': 'admin da Harbor Guild',
    },
    required: (kind: 'participant' | 'organizer') =>
      `Atue como ${kind === 'participant' ? 'participante' : 'organizador'} demo para abrir esta prancha`,
    requiredBody: (names: string) =>
      `Use “Atuando como” no cabeçalho e escolha ${names}. Personas de demonstração não carregam dados pessoais; escolher uma assina um token de curta duração no servidor.`,
    participantNames: 'Rio, Sol ou Ivo',
    organizerNames: 'Mara, Teo ou Lis',
    actingAsName: (name: string) => `Atuando como ${name}`,
  },

  footer: {
    endOfSet: 'Fim do jogo de pranchas',
    tagline:
      'Cada número destas pranchas vem do banco de dados ou de uma execução gravada, e diz de qual.',
    navigation: 'Rodapé',
    links: {
      board: 'Quadro de eventos',
      lab: 'Laboratório de confiabilidade',
      architecture: 'Arquitetura',
      api: 'Referência da API',
      dashboard: 'Painel do organizador',
      registrations: 'Minhas inscrições',
    },
    fictional: 'Eventos fictícios e personas de demonstração.',
    source: 'Código-fonte',
    license: 'Licença MIT · Igor Felipe, 2026',
  },

  hero: {
    sheetNight: 'Prancha 01 / 06 · Noite',
    sheetLit: 'Prancha 01 / 06 · Luzes acesas',
    subject: 'EventCore · reservas sob disputa',
    evidence: 'Gravado em PostgreSQL 18',
    evidenceDetail: 'Cada figura aponta para o seu teste',
    titleLead: 'Duas requisições. Um lugar.',
    titleBefore: 'Exatamente',
    titleKeyword: 'uma',
    titleAfter: 'confirmação.',
    lead: 'Um motor de reservas que serializa cada decisão em uma única linha do banco. A capacidade se mantém, retentativas nunca reservam duas vezes e a lista de espera preserva a ordem.',
    primary: 'Abrir o Laboratório',
    secondary: 'Ler como SQL',
    scroll: 'Role para disputar a vaga',
    finished: 'Agora leia como SQL',
    finalState: 'Estado final',
    beats: [
      {
        title: 'Chegada',
        caption: '23 de 24 lugares ocupados. Sobra um, e duas requisições querem ele.',
      },
      {
        title: 'Disputa',
        caption: 'A e B chegam no mesmo milissegundo, cada uma com a sua chave de idempotência.',
      },
      {
        title: 'O lock',
        caption: 'A trava a linha de estoque com FOR UPDATE. B chega na mesma linha e espera.',
      },
      {
        title: 'Decisão',
        caption: 'Com o lock, A relê 23 de 24 e uma fila vazia. Confirmada e gravada.',
      },
      {
        title: 'Fila',
        caption:
          'B pega o lock, relê 24 de 24 e vira a primeira da fila. As duas respostas são verdadeiras.',
      },
    ],
    seat: (row: string, number: number) => `Fileira ${row} · Lugar ${number}`,
    row: (row: string) => `Fileira ${row}`,
    seatState: (capacity: number, confirmed: number, holder: string | null) =>
      `capacidade ${capacity} · confirmados ${confirmed} · lock: ${holder ?? 'livre'}`,
    a: { arriving: 'A · req 7f3c', holding: 'A · segura o lock' },
    b: {
      arriving: 'B · req 91ad',
      waiting: 'B · esperando o lock',
      holding: 'B · relê 24 / 24',
      queued: 'B · 201 na fila #1',
    },
    drawingDimension: '6 lugares · 4 fileiras · capacidade 24',
    drawingSeat: (seat: string) => `${seat} · A · confirmada`,
    drawingQueue: 'B · na fila #1',
  },

  ledger: {
    label: 'Decisões gravadas',
    replay: 'Replay · execução 02',
    commit: (hash: string) => `commit ${hash}`,
    description: (shown: number) =>
      `As primeiras ${shown} decisões da execução gravada com 100 requisições, na ordem em que o banco as tomou.`,
  },

  landing: {
    fig1: {
      mark: 'Fig. 1 · Luzes acesas',
      title: 'A disputa que você acabou de ver, [instrução] por instrução.',
      lead: 'As mesmas duas requisições e o mesmo lugar, agora como o SQL que decide. Avance no seu ritmo: cada instrução mostrada é uma que o código realmente executa.',
      asText: 'Ler a Fig. 1 como texto',
      facts: [
        { value: '1', unit: 'lock de linha', detail: 'serializa cada decisão de um evento' },
        { value: '0', unit: 'mocks', detail: 'onde se afirma uma garantia do banco' },
        { value: '8', unit: 'invariantes', detail: 'cada um com camada responsável e teste' },
      ],
    },
    failures: {
      mark: 'Modos de falha',
      title: 'Ler e depois escrever é uma [corrida].',
      lead: 'A maioria dos bugs de reserva não tem nada de exótico. É o que acontece por padrão quando uma leitura e uma escrita ficam separadas no tempo, e todo fluxo de reserva separa as duas.',
      columns: {
        failure: 'Falha',
        naive: 'Um sistema ingênuo',
        eventcore: 'EventCore',
        decision: 'Decisão',
      },
      rows: [
        {
          name: 'Overbooking',
          naive:
            'Duas requisições leem “resta 1 vaga” e as duas gravam. O evento agora tem um participante a mais.',
          eventcore:
            'Cada decisão de um evento espera um único lock de linha e relê o estado sob ele.',
          reference: 'ADR 0002',
        },
        {
          name: 'Efeitos duplicados',
          naive:
            'Um clique duplo, ou uma retentativa após timeout, inscreve a mesma pessoa duas vezes.',
          eventcore:
            'A chave de idempotência é gravada junto com o efeito. A retentativa recebe a resposta original.',
          reference: 'ADR 0003',
        },
        {
          name: 'Notificações falsas',
          naive:
            'Um e-mail sai para uma transação desfeita, ou nunca sai para uma que foi confirmada.',
          eventcore:
            'A notificação é gravada em um outbox na mesma transação e entregue depois do commit.',
          reference: 'ADR 0004',
        },
        {
          name: 'Vazamento entre clientes',
          naive: 'Trocar um id na URL mostra a lista de participantes de outro organizador.',
          eventcore:
            'Toda consulta do organizador é limitada pela associação verificada. Ids alheios simplesmente não existem.',
          reference: 'Modelo de ameaças T1',
        },
      ],
      baseline: (confirmed: number, capacity: number) =>
        `Medido em um PostgreSQL 18 real: uma implementação que verifica e depois insere confirmou ${confirmed} pessoas para ${capacity} vagas quando 100 requisições chegaram juntas.`,
      baselineLink: 'Lab, teste 02',
    },
    invariants: {
      mark: 'Garantias',
      title: 'Oito invariantes. Cada um tem um [dono] e um teste.',
      lead: 'Uma garantia é tão forte quanto a camada que a impõe. Cada regra abaixo nomeia essa camada e o arquivo que tenta quebrá-la contra um PostgreSQL 18 real.',
      enforcedBy: 'Imposto por',
      verifiedBy: 'Verificado por',
      rules: {
        I1: {
          rule: 'Lugares confirmados nunca passam da capacidade e nunca ficam abaixo de zero.',
          enforcedBy: 'Lock da linha de estoque + constraints CHECK',
        },
        I2: {
          rule: 'Um participante tem no máximo uma inscrição por evento; reentrar reaproveita a mesma linha.',
          enforcedBy: 'UNIQUE (event_id, user_id) + lock de linha',
        },
        I3: {
          rule: 'A mesma requisição com a mesma chave tem um efeito e uma resposta; um payload diferente é recusado.',
          enforcedBy: 'Chave de idempotência gravada com o efeito',
        },
        I4: {
          rule: 'Nenhuma organização lê ou altera dados de outra organização.',
          enforcedBy: 'Verificação de associação + consultas por tenant',
        },
        I5: {
          rule: 'A lista de espera é por ordem de chegada, e quem chega depois nunca passa na frente.',
          enforcedBy: 'queued_at carimbado sob o lock, ordenado por (queued_at, id)',
        },
        I6: {
          rule: 'Toda mudança crítica deixa um registro de auditoria gravado na mesma transação.',
          enforcedBy: 'Auditoria anexada dentro do comando',
        },
        I7: {
          rule: 'Toda mudança confirmada gera exatamente uma notificação, entregue depois do commit.',
          enforcedBy: 'Outbox transacional + relay sem duplicidade',
        },
        I8: {
          rule: 'Retentativas e falhas transitórias geram respostas claras, que nunca convidam a reenviar sem fim.',
          enforcedBy: 'Problem details com flag de retentativa + cabeçalho de replay',
        },
      },
    },
    anatomy: {
      mark: 'Mecanismo',
      title: 'Uma transação. Uma [ordem] de locks. Nove passos.',
      lead: 'Um monolito modular e um banco que já sabe serializar. Locks distribuídos, filas e sagas foram avaliados e ficaram de fora de propósito.',
      lockOrder: 'Ordem dos locks · idêntica em todo comando',
      lockOrderNote:
        'Todo comando pega seus locks nesta ordem, então dois comandos nunca esperam um pelo outro em ciclo. Deadlocks são eliminados no desenho, sem depender de retentativa.',
      codeTitle: 'Inscrição, resumida',
      cta: 'Ler a prancha de arquitetura',
      steps: [
        {
          title: 'Verificar quem chama',
          detail:
            'Assinatura, emissor, audiência e expiração. O ator vem do token, nunca do corpo da requisição.',
        },
        {
          title: 'Reservar a chave de idempotência',
          detail:
            'Insere ou espera no índice único; uma gêmea já confirmada é repetida em vez de reexecutada.',
        },
        {
          title: 'Travar a linha de estoque',
          detail: 'SELECT … FOR UPDATE. Todo comando deste evento agora roda um de cada vez.',
        },
        {
          title: 'Reler sob o lock',
          detail: 'Regras do evento, a linha do participante e o tamanho da fila, lidos na hora.',
        },
        {
          title: 'Perguntar ao domínio',
          detail: 'Uma função pura decide: confirmar, pôr na fila, recusar ou manter.',
        },
        {
          title: 'Gravar a mudança',
          detail: 'Linha da inscrição, contador e histórico com o id da requisição.',
        },
        {
          title: 'Gravar as consequências',
          detail: 'Registro de auditoria e evento de outbox, na mesma transação.',
        },
        {
          title: 'Guardar a resposta',
          detail: 'Status e corpo salvos na linha de idempotência, depois COMMIT.',
        },
        {
          title: 'Responder',
          detail:
            'Se o cliente nunca receber, uma retentativa com a mesma chave ganha exatamente esta resposta.',
        },
      ],
    },
    proof: {
      mark: 'Prova, gravada',
      title: 'Mesma carga, mesmo banco. Exatamente [dez].',
      lead: 'O Lab reproduz execuções gravadas contra o PostgreSQL 18 através da API real. Estes números são lidos desses arquivos no build; nenhum foi digitado à mão.',
      stats: {
        requests: 'Requisições simultâneas',
        seats: 'Vagas',
        confirmed: 'Confirmadas',
        waitlisted: 'Na fila, em ordem',
        violations: 'Invariantes violados',
      },
      recorded: (date: string, commit: string, postgres: string, cpu: string) =>
        `Gravado em ${date} · commit ${commit} · ${postgres} · ${cpu}`,
      latency: (p95: number) =>
        `p95 medido por quem chama: ${p95} ms, com as 100 na fila de um único lock de linha`,
      scenarios:
        'Oito cenários, cada um ligado ao teste que o comprova, cada um com a máquina, a versão do banco e o commit em que foi medido.',
      cta: 'Abrir o Laboratório',
    },
    limits: {
      mark: 'Limites conhecidos',
      title: 'O que este desenho [não] resolve.',
      lead: 'Toda arquitetura troca alguma coisa. Estas são as trocas, com nome.',
      notes: 'Notas gerais',
      items: [
        {
          limit: 'Um evento disputado, um lock',
          detail:
            'Os comandos de um mesmo evento são serializados por desenho. A vazão desse evento é limitada pela velocidade de uma transação curta. Isso está medido e documentado.',
        },
        {
          limit: 'Rate limit por processo',
          detail:
            'Cada réplica da API mantém os próprios contadores até que um armazenamento compartilhado seja configurado. Basta para uma demo; um ataque distribuído exige mais.',
        },
        {
          limit: 'O Lab é um replay',
          detail:
            'Mostra execuções gravadas em uma máquina. Nunca envia tráfego, e seus tempos descrevem apenas aquela máquina.',
        },
      ],
    },
    verify: {
      mark: 'Fim da prancha',
      title: 'Não acredite na [palavra] da página.',
      lead: 'Quatro comandos sobem o PostgreSQL no Docker e rodam todos os testes desta prancha, incluindo o baseline ingênuo que faz overbooking. Nada é mockado onde se afirma uma garantia do banco.',
    },
  },

  fig1: {
    seatPlan: (capacity: number) => `Mapa de lugares · capacidade ${capacity}`,
    confirmed: (capacity: number) => `/ ${capacity} confirmados`,
    seatsConfirmed: (confirmed: number, capacity: number) =>
      `${confirmed} de ${capacity} lugares confirmados`,
    waitlist: 'Fila',
    empty: 'vazia',
    waitingForLock: 'esperando o lock',
    row: 'linha event_inventory',
    heldBy: (lane: string) => `· com ${lane}`,
    free: '· livre',
    statementTitle: 'Instrução neste passo',
    pause: 'Pausar',
    runAgain: 'Rodar de novo',
    run: 'Rodar a sequência',
    previous: 'Passo anterior',
    next: 'Próximo passo',
    steps: 'Passos',
    stepLabel: (tick: string, index: number, caption: string) =>
      `${tick}, passo ${index}: ${caption}`,
    caption: 'O algoritmo real, passo a passo. As medições gravadas ficam na Prancha 04.',
    captions: [
      'As duas requisições chegam no mesmo milissegundo. Cada uma leva a sua chave de idempotência.',
      'A pega o lock da linha de estoque. B chega na mesma linha e espera por ele.',
      'Com o lock, A relê 23 de 24 lugares e uma fila vazia. Decisão: confirmada.',
      'A grava lugar, histórico, auditoria e evento de outbox de uma vez. O lock é liberado.',
      'B pega o lock e relê a linha: 24 de 24. Ignora o que tinha visto antes.',
      'As duas respostas são finais e verdadeiras. Se A cancelar, B é promovida na mesma transação.',
    ],
  },

  lab: {
    metaDescription:
      'Execuções gravadas contra o PostgreSQL 18: o último lugar, 100 pessoas para 10 vagas ao lado de um baseline ingênuo, retentativas, cancelamentos, mudanças de capacidade, sondagens entre clientes e uma pane de notificações.',
    mark: 'Prancha 04 · Relatório de testes',
    title: 'Execuções gravadas. Cada número aqui saiu de um [banco] real.',
    lead: 'Cada número desta prancha foi produzido por pnpm lab:record contra um PostgreSQL 18 real e a API real. O Lab apenas reproduz esses arquivos e nunca envia tráfego. Cada relatório diz exatamente onde e como foi medido.',
    scenarios: 'Cenários',
    holds: 'invariantes mantidos',
    broken: 'invariantes quebrados',
    legend:
      '✓ significa que todas as verificações de invariantes passaram para o EventCore naquela gravação. O baseline ingênuo aparece para contraste e deve falhar.',
    test: (order: string, date: string, commit: string) =>
      `Teste ${order} · gravado em ${date} · commit ${commit}`,
    question: 'Pergunta',
    method: 'Método',
    compare: 'Comparar implementações',
    holdsMark: '✓ invariantes mantidos',
    brokenMark: '× invariantes quebrados',
    seats: (capacity: number) => `/ ${capacity} vagas`,
    result: (label: string) => `Resultado · ${label}`,
    checks: 'Verificações de invariantes · calculadas a partir das linhas finais',
    timeline: (order: number) => `Fig. 4.${order} · cada tentativa, como quem chamou viu`,
    timelineNote:
      'Cada barra vai do momento em que a requisição saiu até a chegada da resposta, incluindo a espera por uma conexão do pool e pelo lock de estoque. A cor é a resposta.',
    columns: {
      actor: 'Ator',
      sent: 'Enviada',
      answered: 'Respondida',
      answer: 'Resposta',
      decision: 'Decisão no banco',
    },
    replayed: 'repetida',
    conditions: 'Condições',
    environment: {
      database: 'Banco',
      runtime: 'Runtime',
      machine: 'Máquina',
      platform: 'Plataforma',
      transport: 'Transporte',
      pool: 'Pool',
      latency: 'Latência',
    },
    connections: (size: number) => `${size} conexões`,
    doesNotProve: 'O que esta execução não prova',
    reproduce: 'Reproduzir',
    assertion: 'A asserção por trás deste replay fica em',
    replay: 'Reproduzir a execução',
    scrub: 'Avançar',
    milliseconds: (value: string) => `${value} milissegundos`,
    attemptsOver: (attempts: number, span: string) =>
      `${attempts} tentativas ao longo de ${span} milissegundos`,
    answeredSoFar: 'Respondidas até agora',
    nothingYet: 'Nada ainda',
    inFlight: 'Em andamento',
    outcome: {
      summary: (confirmed: number, capacity: number, overbooked: number, waitlisted: number) =>
        `${confirmed} confirmadas para ${capacity} vagas${overbooked ? `, ${overbooked} acima da capacidade` : ''}, ${waitlisted} na fila`,
      confirmed: 'Confirmadas',
      overbooked: 'Acima da capacidade',
      waitlisted: 'Na fila',
      capacity: 'Capacidade',
    },
  },

  board: {
    metaDescription:
      'Todos os eventos públicos, com vagas lidas do banco de dados no momento da requisição.',
    mark: 'Quadro · ao vivo',
    title: 'Cada contagem de vagas aqui foi lida do banco há um instante.',
    lead: 'As contagens são fotografias. Quando você reserva, a decisão é tomada de novo sob o lock de estoque, independentemente do que este quadro mostrou.',
    filters: { label: 'Filtrar eventos', all: 'Todos', open: 'Abertos', closed: 'Encerrados' },
    empty: 'Nenhum evento corresponde a este filtro ainda.',
    left: (available: number) => `${available} ${available === 1 ? 'restante' : 'restantes'}`,
    full: 'Lotado',
    fullWaiting: (waiting: number) => `Lotado · ${waiting} na fila`,
    snapshot: 'Fotografia',
  },

  event: {
    back: 'Quadro de eventos',
    starts: 'Começa',
    venue: 'Local',
    closes: 'Inscrições encerram',
    waitlist: 'Lista de espera',
    waitlistKept: 'Mantida, por ordem de chegada',
    waitlistNone: 'Nenhuma',
    capacity: 'Capacidade',
    organizer: 'Organização',
    availability: 'Disponibilidade · fotografia',
    left: (capacity: string) => `de ${capacity} restantes`,
    snapshotLine: (confirmed: number, waiting: number, time: string) =>
      `${confirmed} confirmadas · ${waiting} na fila · lido às ${time}`,
    disclaimer:
      'Este número pode mudar antes de você apertar o botão. Sua requisição é decidida pelo banco, sob um lock, independentemente do que esta página mostra.',
    organizerNotice:
      'Você está atuando como organizador. Troque para uma persona participante para reservar.',
    closed: {
      CLOSED: 'A organização encerrou as inscrições. As vagas já confirmadas continuam valendo.',
      CANCELLED: 'Este evento foi cancelado.',
      notYet: 'As inscrições ainda não abriram.',
      ended: 'As inscrições para este evento terminaram.',
    },
  },

  registration: {
    asking: 'Perguntando ao banco…',
    steps: [
      'Verificou o token demo e identificou o participante',
      'Reservou a chave de idempotência, ou encontrou a gêmea já gravada',
      'Travou a linha de estoque e releu vagas, fila e a sua linha',
      'Gravou a decisão com histórico, auditoria e evento de outbox',
    ],
    headline: {
      CONFIRMED:
        'Você está confirmado. A vaga está garantida pelo banco, faça esta página o que fizer.',
      WAITLISTED: (position: string) =>
        `Você é o #${position} da fila. Se uma vaga abrir, a promoção é automática e respeita a ordem.`,
      REJECTED: 'Todas as vagas estão ocupadas e este evento não mantém lista de espera.',
      CANCELLED: 'Esta inscrição está cancelada.',
    },
    stub: {
      CONFIRMED: 'Admite um',
      WAITLISTED: 'Na fila',
      REJECTED: 'Esgotado',
      CANCELLED: 'Cancelada',
    },
    replayedAnswer: 'Resposta repetida',
    noChange: 'Sem mudança',
    newDecision: 'Nova decisão',
    replayedNote:
      'Mesma requisição de antes, então aqui está a resposta original. Nada foi reservado duas vezes.',
    unchangedNote:
      'Você já tinha esta inscrição, então o banco devolveu a mesma em vez de criar outra.',
    key: 'Chave de idempotência',
    decidedBy: 'Decidida pela requisição',
    answered: 'Requisição respondida',
    after: 'Fotografia após a decisão',
    queue: 'fila',
    alreadyHeld: 'Você já tem esta inscrição',
    currentStatus: 'Status atual',
    retrySafe: 'Tentar de novo é seguro: usa a mesma chave, então não reserva duas vezes.',
    unavailableTitle: 'Não conseguimos confirmar o resultado',
    unavailable:
      'A API não respondeu a tempo. Tentar de novo é seguro: a mesma chave de idempotência vai junto, então não reserva duas vezes.',
    personaTitle: 'Escolha primeiro uma persona demo',
    persona: 'Use “Atuando como” no cabeçalho. Sem conta e sem dados pessoais.',
    closedTitle: 'As inscrições não estão abertas',
    retry: 'Tentar de novo com a mesma chave',
    askAgain: 'Pedir de novo, sem duplicar',
    reserve: 'Reservar uma vaga',
    resend: (key: string) => `Reenviar exatamente a mesma requisição (${key}…)`,
    cancelling: 'Cancelando…',
    cancel: 'Cancelar inscrição',
    cancelledPromoted: 'Cancelada. A próxima pessoa da fila foi promovida na mesma transação.',
    cancelled: 'Cancelada.',
    retrySafeShort: ' Tentar de novo é seguro.',
    noAnswer: 'A API não respondeu. Tentar de novo é seguro: usa a mesma chave.',
  },

  mine: {
    mark: 'Participante',
    title: 'Cada estado em que você esteve, e por quê.',
    lead: 'Cada inscrição guarda o histórico completo. A posição na fila é calculada na hora da leitura, então ela só anda para a frente.',
    empty: 'Nenhuma inscrição ainda.',
    find: 'Encontrar um evento',
    history: 'Histórico',
    new: 'nova',
    reasons: {
      'participant.registered': 'Inscrição feita',
      'participant.reentered': 'Inscrição feita de novo',
      'participant.cancelled': 'Cancelada por você',
      'organizer.cancelled': 'Cancelada pela organização',
      'waitlist.promoted': 'Promovida da lista de espera',
      seed: 'Importada',
    },
  },

  dashboard: {
    mark: 'Organização',
    title: 'Só as organizações das quais você faz parte. Nada mais existe.',
    lead: 'Cada requisição abaixo leva o seu token, e a API resolve o seu papel na organização do caminho antes de ler qualquer coisa.',
    role: (role: string) => `Seu papel · ${role}`,
    newDraft: 'Novo evento em rascunho',
    meter: (confirmed: number, capacity: number, waiting: number) =>
      `${confirmed}/${capacity} confirmadas · ${waiting} na fila`,
    roles: { ADMIN: 'admin', ORGANIZER: 'organização', VIEWER: 'leitura' },
  },

  panel: {
    publicSheet: 'Prancha pública',
    inventory: 'Estoque',
    inventoryLine: (available: number, waiting: number, time: string) =>
      `${available} disponíveis · ${waiting} na fila · lido às ${time}`,
    lifecycle: 'Ciclo de vida',
    integrity: 'Verificação de integridade',
    integrityItems: {
      withinCapacity: 'Dentro da capacidade',
      projection: 'Contador bate com as linhas',
      idle: 'Nenhuma vaga ociosa com fila',
    },
    integrityUnavailable: 'Relatório de integridade indisponível.',
    integrityLine: (counter: number, confirmed: number, waitlisted: number) =>
      `contador ${counter} · linhas confirmadas ${confirmed} · linhas na fila ${waitlisted}`,
    registrations: 'Inscrições',
    nobody: 'Ninguém se inscreveu ainda.',
    columns: { participant: 'Participante', status: 'Status', registered: 'Inscrição' },
    audit: 'Trilha de auditoria · recentes',
    auditAdmins: 'A trilha de auditoria é visível apenas para admins.',
    transitions: {
      DRAFT: 'Voltar para rascunho',
      PUBLISHED: 'Publicar',
      CLOSED: 'Encerrar inscrições',
      CANCELLED: 'Cancelar evento',
    },
    applying: 'Aplicando…',
    terminal: 'Este status é final.',
    newCapacity: 'Nova capacidade',
    apply: 'Aplicar sob lock',
    locking: 'Travando a linha…',
    capacityHint: (confirmed: number) =>
      `Nunca abaixo de ${confirmed} confirmadas. Aumentar promove pessoas da fila na mesma transação.`,
    adminsOnly: 'Apenas admins podem mudar a capacidade.',
    moved: (status: string) => `Movido para ${status}.`,
    capacityNow: (capacity: number, promoted: number, replayed: boolean) =>
      `A capacidade agora é ${capacity}.${promoted > 0 ? ` ${promoted} promovidas da fila na mesma transação.` : ''}${replayed ? ' (repetida)' : ''}`,
    unavailable: 'A API não respondeu. O que não mudou pode ser tentado de novo com segurança.',
  },

  newEvent: {
    mark: 'Rascunho',
    title: 'Defina as vagas antes que alguém possa ocupar uma.',
    failed: 'O rascunho não foi criado',
    identity: 'Identidade',
    organization: 'Organização',
    name: 'Nome',
    slug: 'Slug',
    slugHint: 'Letras minúsculas, dígitos e hifens simples. Faz parte do endereço público.',
    venue: 'Local',
    description: 'Descrição',
    schedule: 'Agenda',
    opens: 'Inscrições abrem',
    closes: 'Inscrições encerram',
    starts: 'Evento começa',
    zone: 'Horários em UTC−03:00',
    seats: 'Vagas',
    capacity: 'Capacidade',
    capacityHint: 'Pode aumentar depois; nunca abaixo das vagas confirmadas.',
    waitlist: 'Manter lista de espera por ordem de chegada quando lotar',
    creating: 'Criando rascunho…',
    create: 'Criar rascunho',
    draftNote: 'O evento começa como rascunho, invisível para participantes.',
    invalidField: 'Confira este campo.',
  },

  architecture: {
    metaDescription:
      'Módulos, fluxo de requisição, modelo de dados, registros de decisão e modelo de ameaças do EventCore.',
    mark: 'Prancha 06 · Sistema',
    title: 'Um monolito modular, de [propósito].',
    lead: 'O problema difícil é uma decisão síncrona sobre um único lugar. Dividir isso em serviços transformaria uma transação em um protocolo distribuído. Por isso há uma API, um banco e um worker, com as fronteiras dos módulos visíveis no código.',
    figure: 'Fronteiras de execução e o que passa por elas.',
    flowMark: 'Caminho da requisição',
    flowTitle: 'Oito passos da requisição à entrega.',
    flow: [
      [
        'Autenticar',
        'Verifica assinatura, emissor, audiência e expiração; resolve o usuário pelo subject.',
      ],
      ['Autorizar', 'Resolve o papel na organização do caminho, ou a posse da inscrição.'],
      ['Validar', 'Zod na fronteira; campos desconhecidos descartados ou recusados.'],
      ['Reservar chave', 'Linha de idempotência inserida dentro da transação.'],
      ['Travar', 'event_inventory FOR UPDATE, o único ponto de serialização.'],
      ['Decidir', 'Função pura de domínio sobre o estado recém-lido.'],
      [
        'Persistir',
        'Linhas, contador, histórico, auditoria, outbox e resposta guardada em um COMMIT.',
      ],
      ['Entregar', 'O worker repassa o outbox depois do commit, pelo menos uma vez, sem duplicar.'],
    ],
    lockStep: 4,
    dataMark: 'Modelo de dados',
    dataTitle: 'O banco impõe o que consegue. O código impõe o resto.',
    columns: { table: 'Tabela', constraint: 'Constraint que importa', role: 'Papel' },
    tables: {
      event_inventory: 'A linha que toda decisão de capacidade trava.',
      registrations: 'Uma inscrição lógica por participante.',
      registration_events: 'Cada transição, com a requisição que a causou.',
      idempotency_requests: 'Status e corpo guardados para replays.',
      audit_log: 'Quem mudou o quê, nunca dados pessoais.',
      outbox_events: 'Notificações gravadas junto com a mudança.',
      notification_deliveries: 'Registro de entrega sem duplicidade.',
    },
    decisionsMark: 'Registros de decisão',
    decisionsTitle: 'Toda escolha estrutural está escrita, com o que ela custa.',
    decisionsEmpty: 'Os registros de decisão são lidos de docs/adr no build.',
    documentsNote: 'Os registros de decisão e os documentos técnicos estão em inglês.',
    readingMark: 'Leitura complementar',
    readingTitle: 'O resto do jogo de pranchas.',
    documents: {
      'docs/00-vision.md': 'Visão e invariantes',
      'docs/domain-state-machine.md': 'Máquina de estados do domínio',
      'docs/threat-model.md': 'Modelo de ameaças',
      'DESIGN.md': 'Design system',
      'docs/experience/03-concept.md': 'Conceito de experiência',
    },
    diagram: {
      label:
        'Navegador para o servidor Next.js, para a API Fastify com oito módulos, para o PostgreSQL; um worker lê o outbox do PostgreSQL e entrega na caixa de e-mail demo.',
      browser: ['Navegador', 'sem tokens, sem chaves'],
      next: ['Next.js 16', 'server components · actions'],
      nextNote: 'Assina tokens demo no servidor. Renderiza o Lab a partir dos arquivos de replay.',
      api: ['API Fastify', 'um processo · monolito modular'],
      postgres: ['PostgreSQL 18', 'locks · constraints · outbox'],
      worker: ['Worker', 'relay · backoff · varredura'],
      mailbox: ['Caixa de e-mail demo', 'sem e-mail real no MVP'],
      links: {
        https: 'HTTPS · cookie',
        bearer: 'JWT bearer',
        transaction: '1 transação',
        skipLocked: 'SKIP LOCKED',
        dedupe: 'chave de dedupe',
      },
    },
  },

  apiDocs: {
    metaDescription:
      'Índice de endpoints gerado a partir do documento OpenAPI 3.1 publicado pela API do EventCore.',
    mark: 'Prancha 06 · Contrato',
    title: 'Gerado a partir dos mesmos schemas que validam as requisições.',
    lead: 'A API publica OpenAPI 3.1 construído a partir dos contratos Zod, então este índice não tem como divergir do código. Erros são documentos RFC 9457 com código estável e flag de retentativa.',
    example: 'Uma chamada idempotente',
    swagger: 'Abrir o Swagger UI interativo',
    endpoints: 'Endpoints',
    bearer: 'bearer',
    idempotent: 'idempotente',
  },

  notFound: {
    mark: '404 · Nenhuma prancha neste endereço',
    title: 'Este desenho não faz parte do jogo.',
    lead: 'A página pode ter mudado de lugar, ou o evento ainda é um rascunho que só a organização enxerga.',
    board: 'Abrir o quadro de eventos',
    home: 'Voltar para a Prancha 01',
  },

  error: {
    mark: 'Falha inesperada',
    title: 'Esta prancha não conseguiu ser renderizada.',
    lead: 'Nada do que você enviou se perdeu: todo comando é idempotente, então tentar de novo é seguro.',
    reference: 'Referência',
    retry: 'Tentar de novo',
  },

  api: {
    unavailableTitle: 'A API não está acessível nesta implantação',
    unavailableAction: 'O Lab continua funcionando',
    unavailableBody:
      'As páginas ao vivo precisam da API do EventCore. O Laboratório e a prancha de arquitetura funcionam sem ela. Localmente, rode pnpm db:up e pnpm dev.',
    problems: {
      VALIDATION_FAILED: 'A requisição não é válida.',
      IDEMPOTENCY_KEY_REQUIRED: 'O cabeçalho Idempotency-Key é obrigatório.',
      UNAUTHENTICATED: 'É preciso autenticar.',
      FORBIDDEN_TENANT: 'Você não faz parte desta organização.',
      INSUFFICIENT_ROLE: 'Seu papel não permite esta ação.',
      NOT_FOUND: 'O recurso não existe.',
      EVENT_CLOSED: 'As inscrições deste evento não estão abertas.',
      SOLD_OUT: 'O evento está esgotado e não tem lista de espera.',
      CAPACITY_BELOW_CONFIRMED: 'A capacidade não pode ficar abaixo das vagas confirmadas.',
      INVALID_EVENT_TRANSITION: 'O evento não pode ir para esse status.',
      INVALID_REGISTRATION_TRANSITION: 'A inscrição não pode mudar dessa forma.',
      SLUG_TAKEN: 'Esse slug já está em uso.',
      IDEMPOTENCY_KEY_REUSED: 'Esta Idempotency-Key já foi usada com uma requisição diferente.',
      INVALID_CAPACITY: 'A capacidade não é válida.',
      INVALID_ENROLLMENT_WINDOW: 'A janela de inscrição não é válida.',
      RATE_LIMITED: 'Requisições demais. Espere um pouco e tente de novo.',
      INTERNAL_ERROR: 'Algo deu errado do nosso lado.',
      INVARIANT_VIOLATION: 'Uma verificação de invariante de negócio falhou.',
      TEMPORARY_UNAVAILABLE: 'O serviço está temporariamente indisponível.',
    },
  },

  status: {
    registration: {
      CONFIRMED: 'Confirmada',
      WAITLISTED: 'Na fila',
      REJECTED: 'Recusada',
      CANCELLED: 'Cancelada',
    },
    event: { DRAFT: 'Rascunho', PUBLISHED: 'Aberto', CLOSED: 'Encerrado', CANCELLED: 'Cancelado' },
    eventLower: {
      DRAFT: 'rascunho',
      PUBLISHED: 'publicado',
      CLOSED: 'encerrado',
      CANCELLED: 'cancelado',
    },
  },

  meter: {
    summary: (confirmed: number, capacity: number, available: number, waitlisted: number) =>
      `${confirmed} de ${capacity} vagas confirmadas, ${available} disponíveis, ${waitlisted} na fila`,
  },
}
