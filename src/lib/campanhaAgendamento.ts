export type ContatoLote = {
  id: string;
  nome: string | null;
  whatsapp_numero: string;
};

export type ConfigAgendamento = {
  dataInicioIso: string;
  horaInicioDia: string;
  horaFimDia: string;
  limiteDiario: number;
  variacaoMinutos: number;
  qtdLote1: number;
  qtdLote2: number;
  maxLotes: number;
  intervaloMinSegundos: number;
  intervaloMaxSegundos: number;
  mensagensOpcoes: string[];
};

export type AgendamentoGerado = {
  contato: ContatoLote;
  agendadoPara: string;
  mensagemTexto: string;
  diaIndex: number;
};

function parseHora(hhmm: string): { hours: number; minutes: number } {
  const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10));
  return {
    hours: Number.isFinite(h) ? h : 0,
    minutes: Number.isFinite(m) ? m : 0,
  };
}

function addMinutes(date: Date, minutes: number): Date {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

function randomInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function distribuirTotalAleatorio(total: number, n: number): number[] {
  if (n <= 1) return [total];
  if (total <= n) {
    const base = Array(n).fill(1);
    let restante = total - n;
    while (restante > 0) {
      const idx = randomInt(0, n - 1);
      base[idx] += 1;
      restante -= 1;
    }
    return base;
  }

  const cortes = new Set<number>();
  while (cortes.size < n - 1) {
    const v = randomInt(1, total - 1);
    cortes.add(v);
  }
  const pontos = [0, ...Array.from(cortes).sort((a, b) => a - b), total];
  const result: number[] = [];
  for (let i = 1; i < pontos.length; i++) {
    result.push(pontos[i] - pontos[i - 1]);
  }
  return result;
}

export function gerarAgendamentosPorDestinatario(
  contatos: ContatoLote[],
  config: ConfigAgendamento,
): AgendamentoGerado[] {
  const {
    dataInicioIso,
    horaInicioDia,
    horaFimDia,
    limiteDiario,
    variacaoMinutos,
    qtdLote1,
    qtdLote2,
    maxLotes,
    mensagensOpcoes,
  } = config;

  if (!contatos.length) return [];
  const mensagensValidas = mensagensOpcoes.map((m) => m.trim()).filter(Boolean);
  if (!mensagensValidas.length) {
    throw new Error('Nenhuma mensagem válida informada.');
  }

  const total = contatos.length;
  const lotesMax = Math.max(1, maxLotes);

  const q1 = Math.min(qtdLote1 || 0, total);
  const restDepoisLote1 = total - q1;

  const q2 = Math.min(qtdLote2 || 0, restDepoisLote1);
  const restDepoisLote2 = restDepoisLote1 - q2;

  const diasRestantes = Math.max(lotesMax - 2, 0);
  let distribRestante: number[] = [];
  if (diasRestantes > 0) {
    distribRestante = distribuirTotalAleatorio(restDepoisLote2, diasRestantes);
  }

  const quantPorDia: number[] = [];
  if (q1 > 0) quantPorDia.push(q1);
  if (q2 > 0) quantPorDia.push(q2);
  quantPorDia.push(...distribRestante);

  const somaAtual = quantPorDia.reduce((acc, v) => acc + v, 0);
  if (somaAtual > total) {
    const diff = somaAtual - total;
    quantPorDia[quantPorDia.length - 1] = Math.max(
      0,
      quantPorDia[quantPorDia.length - 1] - diff,
    );
  }

  const somaCorrigida = quantPorDia.reduce((acc, v) => acc + v, 0);
  if (somaCorrigida < total && quantPorDia.length > 0) {
    quantPorDia[quantPorDia.length - 1] += total - somaCorrigida;
  }

  const baseDate = new Date(dataInicioIso);
  const { hours: hInicio, minutes: mInicio } = parseHora(horaInicioDia);
  const { hours: hFim, minutes: mFim } = parseHora(horaFimDia);

  const resultados: AgendamentoGerado[] = [];
  let cursorContato = 0;

  quantPorDia.forEach((qtdDia, diaIndex) => {
    if (qtdDia <= 0) return;
    if (cursorContato >= contatos.length) return;

    const maxDia = limiteDiario > 0 ? limiteDiario : qtdDia;
    const efetivoDia = Math.min(qtdDia, maxDia);

    const dia = new Date(baseDate);
    dia.setDate(dia.getDate() + diaIndex);

    const inicioDiaBase = new Date(dia);
    inicioDiaBase.setHours(hInicio, mInicio, 0, 0);

    const fimDiaBase = new Date(dia);
    fimDiaBase.setHours(hFim, mFim, 0, 0);

    let inicioDiaVar = inicioDiaBase;
    let fimDiaVar = fimDiaBase;

    if (diaIndex > 0 && variacaoMinutos && variacaoMinutos > 0) {
      const deltaInicio = randomInt(-variacaoMinutos, variacaoMinutos);
      const deltaFim = randomInt(-variacaoMinutos, variacaoMinutos);
      inicioDiaVar = addMinutes(inicioDiaBase, deltaInicio);
      fimDiaVar = addMinutes(fimDiaBase, deltaFim);
    }

    let janelaMs = fimDiaVar.getTime() - inicioDiaVar.getTime();
    if (janelaMs <= 0) {
      inicioDiaVar = inicioDiaBase;
      fimDiaVar = fimDiaBase;
      janelaMs = fimDiaVar.getTime() - inicioDiaVar.getTime();
    }

    const us: number[] = [];
    for (let i = 0; i < efetivoDia; i++) {
      us.push(Math.random());
    }
    us.sort((a, b) => a - b);

    for (let i = 0; i < efetivoDia && cursorContato < contatos.length; i++) {
      const contato = contatos[cursorContato++];
      const u = us[i];
      const tMs = inicioDiaVar.getTime() + Math.floor(janelaMs * u);
      const agendadoDate = new Date(tMs);
      const mensagemTexto =
        mensagensValidas[randomInt(0, mensagensValidas.length - 1)];

      resultados.push({
        contato,
        agendadoPara: agendadoDate.toISOString(),
        mensagemTexto,
        diaIndex,
      });
    }
  });

  while (cursorContato < contatos.length && resultados.length < contatos.length) {
    const contato = contatos[cursorContato++];
    const ultimo = resultados[resultados.length - 1];
    const base = ultimo ? new Date(ultimo.agendadoPara) : baseDate;
    const agendado = addMinutes(base, randomInt(1, 10));
    const mensagemTexto =
      mensagensValidas[randomInt(0, mensagensValidas.length - 1)];
    resultados.push({
      contato,
      agendadoPara: agendado.toISOString(),
      mensagemTexto,
      diaIndex: ultimo ? ultimo.diaIndex : 0,
    });
  }

  return resultados;
}

