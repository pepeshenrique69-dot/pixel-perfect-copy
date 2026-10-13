import { describe, expect, it } from "vitest";
import { draftMessage } from "@/lib/nexvya/assistant";
import { summary } from "@/lib/nexvya/metrics";
import { changeStage, completeAction, createOpportunity, updateOpportunity, validate } from "@/lib/nexvya/ops";
import { bucketOf, prioritized } from "@/lib/nexvya/rules";
import { emptyInput, type OpportunityInput } from "@/lib/nexvya/types";

const T = "2026-10-13";
const NOW = "2026-10-13T12:00:00.000Z";
const mk = (p: Partial<OpportunityInput>) => createOpportunity({ ...emptyInput(), contact: "Ana", product: "X", ...p }, NOW);

describe("Central de ações", () => {
  it("classifica atrasada, hoje, próxima e sem agendamento", () => {
    expect(bucketOf(mk({ nextFollowUp: "2026-10-10", nextAction: "a" }), T)).toBe("atrasadas");
    expect(bucketOf(mk({ nextFollowUp: T, nextAction: "a" }), T)).toBe("hoje");
    expect(bucketOf(mk({ nextFollowUp: "2026-10-20", nextAction: "a" }), T)).toBe("proximas");
    expect(bucketOf(mk({}), T)).toBe("sem_agendamento");
  });
  it("oportunidades ganhas ou perdidas não geram ações", () => {
    expect(bucketOf(mk({ stage: "ganho", nextFollowUp: "2026-10-01" }), T)).toBeNull();
  });
  it("explica atraso em dias e a próxima ação", () => {
    const [x] = prioritized([mk({ nextFollowUp: "2026-10-10", nextAction: "enviar proposta" })], T);
    expect(x.e.headline).toBe("Acompanhamento atrasado há 3 dias.");
    expect(x.e.reasons[0]).toBe("Próxima ação registrada: enviar proposta.");
  });
  it("prioriza mais atrasada primeiro", () => {
    const a = mk({ contact: "A", nextFollowUp: "2026-10-12", nextAction: "a" });
    const b = mk({ contact: "B", nextFollowUp: "2026-10-01", nextAction: "a" });
    expect(prioritized([a, b], T).map((x) => x.o.contact)).toEqual(["B", "A"]);
  });
  it("concluir ação registra histórico e atualiza último contato", () => {
    const o = completeAction(mk({ nextFollowUp: T, nextAction: "ligar" }), { result: "ok", nextFollowUp: null, nextAction: "" }, NOW, T);
    expect(o.lastContact).toBe(T);
    expect(o.nextFollowUp).toBeNull();
    expect(o.activities[0].type).toBe("acao_concluida");
  });
});

describe("Indicadores", () => {
  it("valor potencial soma só abertas com valor; ganhas não contam como potencial", () => {
    const opps = [mk({ value: 1000 }), mk({ value: null }), mk({ value: 5000, stage: "ganho" })];
    const m = summary(opps, T, "30");
    expect(m.openCount).toBe(2);
    expect(m.potentialValue).toBe(1000);
    expect(m.wonCount).toBe(1);
    expect(m.wonValue).toBe(5000);
  });
  it("sem valores cadastrados, o potencial fica indefinido", () => {
    expect(summary([mk({})], T, "all").potentialValue).toBeNull();
  });
});

describe("Etapas e validação", () => {
  it("mudar etapa preserva o histórico", () => {
    const o = mk({});
    const moved = changeStage(o, "negociacao", NOW);
    expect(moved.activities).toHaveLength(o.activities.length + 1);
    expect(moved.stage).toBe("negociacao");
  });
  it("editar mantém dados e reabrir limpa a data de fechamento", () => {
    const won = changeStage(mk({ value: 10 }), "ganho", NOW);
    const reopened = updateOpportunity(won, { ...won, stage: "qualificado" }, NOW);
    expect(reopened.closedAt).toBeNull();
    expect(reopened.value).toBe(10);
  });
  it("exige motivo ao marcar como perdida e nome do contato", () => {
    const e = validate({ ...emptyInput(), product: "X", stage: "perdido" });
    expect(e.contact).toBeDefined();
    expect(e.lossReason).toBeDefined();
  });
  it("rejeita datas inválidas e valores negativos", () => {
    const e = validate({ ...emptyInput(), contact: "A", product: "X", lastContact: "2026-02-30", value: -5 });
    expect(e.lastContact).toBeDefined();
    expect(e.value).toBeDefined();
  });
});

describe("Assistente", () => {
  it("pede contexto para responder objeção", () => {
    expect(draftMessage({ opportunity: mk({}), purpose: "objecao", context: "", formal: true }).ok).toBe(false);
  });
});
