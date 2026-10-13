import { addDays } from "./dates";
import { activity, uid } from "./ops";
import type { Opportunity, Stage } from "./types";

const at = (date: string, h = 10) => new Date(`${date}T${String(h).padStart(2, "0")}:00:00`).toISOString();

interface Seed {
  contact: string;
  company: string;
  product: string;
  value: number | null;
  stage: Stage;
  created: number;
  last: number | null;
  next: number | null;
  nextAction: string;
  notes: string;
  lossReason?: string;
  closed?: number;
  done?: { day: number; text: string }[];
}

const SEEDS: Seed[] = [
  { contact: "Mariana Costa", company: "Estúdio Lume", product: "Identidade visual", value: 4800, stage: "negociacao", created: -40, last: -9, next: -3, nextAction: "Enviar proposta revisada", notes: "Pediu opção com parcelamento em 3x.", done: [{ day: -20, text: "Ação concluída: Reunião de diagnóstico. Resultado: escopo definido." }] },
  { contact: "Rafael Nunes", company: "Nunes Contabilidade", product: "Consultoria mensal", value: 2500, stage: "qualificado", created: -18, last: -6, next: 0, nextAction: "Ligar para agendar demonstração", notes: "Indicado por cliente atual." },
  { contact: "Juliana Prado", company: "", product: "Fotografia de produto", value: null, stage: "novo", created: -5, last: -5, next: null, nextAction: "", notes: "Chegou pelo Instagram, ainda sem orçamento." },
  { contact: "Carlos Mendes", company: "Mendes Engenharia", product: "Site institucional", value: 9200, stage: "negociacao", created: -60, last: -21, next: -8, nextAction: "Esclarecer prazo de entrega", notes: "Comparando com outro fornecedor." },
  { contact: "Ana Ribeiro", company: "Clínica Bem Viver", product: "Gestão de redes sociais", value: 1800, stage: "qualificado", created: -12, last: -2, next: 4, nextAction: "Apresentar plano de conteúdo", notes: "" },
  { contact: "Pedro Almeida", company: "Almeida Móveis", product: "Catálogo digital", value: 3500, stage: "ganho", created: -95, last: -30, next: null, nextAction: "", notes: "Pagamento em duas parcelas.", closed: -30, done: [{ day: -45, text: "Ação concluída: Enviar proposta. Resultado: aceita com ajustes." }] },
  { contact: "Beatriz Lima", company: "Lima & Filhos", product: "Treinamento de equipe", value: 6000, stage: "ganho", created: -70, last: -12, next: null, nextAction: "", notes: "", closed: -12 },
  { contact: "Thiago Rocha", company: "Rocha Tech", product: "Consultoria mensal", value: 2500, stage: "perdido", created: -80, last: -50, next: null, nextAction: "", notes: "", lossReason: "Orçamento congelado até o próximo ano", closed: -50 },
  { contact: "Fernanda Souza", company: "Souza Eventos", product: "Identidade visual", value: 3900, stage: "novo", created: -2, last: null, next: 2, nextAction: "Primeiro contato por telefone", notes: "" },
];

export function buildDemo(today: string): Opportunity[] {
  return SEEDS.map((s) => {
    const createdAt = at(addDays(today, s.created), 9);
    const activities = [activity("criado", "Oportunidade criada (demonstração).", createdAt)];
    for (const d of s.done ?? []) activities.unshift(activity("acao_concluida", d.text, at(addDays(today, d.day), 15)));
    const closedAt = s.closed !== undefined ? at(addDays(today, s.closed), 17) : null;
    if (closedAt) activities.unshift(activity("etapa", `Etapa alterada para ${s.stage === "ganho" ? "Ganho" : "Perdido"}.`, closedAt));
    return {
      id: uid(),
      contact: s.contact,
      company: s.company,
      product: s.product,
      value: s.value,
      stage: s.stage,
      lastContact: s.last === null ? null : addDays(today, s.last),
      nextFollowUp: s.next === null ? null : addDays(today, s.next),
      nextAction: s.nextAction,
      notes: s.notes,
      lossReason: s.lossReason ?? "",
      activities,
      createdAt,
      closedAt,
      demo: true,
    };
  });
}
