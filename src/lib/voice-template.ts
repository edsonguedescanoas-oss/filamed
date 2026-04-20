/**
 * Templates de chamada para o painel TV.
 *
 * O admin escolhe um destes em /app/voz; a TV monta o texto a partir das
 * partes disponíveis (paciente, código, fila, destino) seguindo o template.
 *
 * IMPORTANTE: o nome do paciente pode estar ausente (chamadas sem paciente
 * vinculado) — nesse caso a parte "Paciente X." é omitida silenciosamente.
 */
export type TemplateChamada =
  | "paciente_senha_fila"
  | "paciente_senha_fila_destino"
  | "paciente_senha_destino"
  | "senha_destino"
  | "senha_fila";

export interface TemplateChamadaOption {
  id: TemplateChamada;
  label: string;
  /** Exemplo do que será falado, com placeholders preenchidos. */
  exemplo: string;
  description: string;
}

export const TEMPLATE_OPTIONS: TemplateChamadaOption[] = [
  {
    id: "paciente_senha_fila",
    label: "Paciente + Senha + Fila",
    exemplo: "Paciente João Silva. Senha A zero quatro cinco. Fila Consulta Geral.",
    description: "Padrão. Não inclui o destino (guichê/sala) digitado pelo operador.",
  },
  {
    id: "paciente_senha_fila_destino",
    label: "Paciente + Senha + Fila + Dirija-se ao destino",
    exemplo:
      "Paciente João Silva. Senha A zero quatro cinco. Fila Consulta Geral. Dirija-se ao Consultório 2.",
    description: "Adiciona 'Dirija-se ao {destino}' ao final, usando o local digitado na chamada.",
  },
  {
    id: "paciente_senha_destino",
    label: "Paciente + Senha + Dirija-se ao destino",
    exemplo: "Paciente João Silva. Senha A zero quatro cinco. Dirija-se ao Consultório 2.",
    description: "Substitui o nome da fila pelo destino. Bom para clínicas com poucas filas.",
  },
  {
    id: "senha_destino",
    label: "Senha + Dirija-se ao destino",
    exemplo: "Senha A zero quatro cinco. Dirija-se ao Consultório 2.",
    description: "Não anuncia o nome do paciente (mais privacidade).",
  },
  {
    id: "senha_fila",
    label: "Senha + Fila",
    exemplo: "Senha A zero quatro cinco. Fila Consulta Geral.",
    description: "Mais curto e neutro. Sem paciente nem destino.",
  },
];

export interface MontarTextoArgs {
  template: TemplateChamada;
  /** Nome do paciente já reduzido (primeiro + último). Pode ser null. */
  nome: string | null;
  /** Código da senha já soletrado para TTS (ex.: "A zero quatro cinco"). */
  codigoFalado: string;
  /** Nome humano da fila (não o prefixo). */
  nomeFila: string | null;
  /** Texto livre digitado pelo operador na chamada (ex.: "Consultório 2"). */
  destino: string | null;
  /**
   * Função opcional para formatar o destino com a preposição certa
   * ("ao Consultório 2", "à Sala 3"). Mantido como dependência injetada
   * pra reusar a heurística que já existe na TV sem duplicar.
   */
  formatarDestino?: (d: string) => string;
}

/**
 * Monta o texto final que o TTS vai falar, seguindo o template escolhido.
 * Partes vazias/null são omitidas — nunca falamos "Paciente." sozinho.
 */
export function montarTextoChamada({
  template,
  nome,
  codigoFalado,
  nomeFila,
  destino,
  formatarDestino,
}: MontarTextoArgs): string {
  const partePaciente = nome ? `Paciente ${nome}.` : null;
  const parteSenha = codigoFalado ? `Senha ${codigoFalado}.` : null;
  const parteFila = nomeFila ? `Fila ${nomeFila}.` : null;
  const destinoFormatado = destino?.trim()
    ? formatarDestino
      ? formatarDestino(destino.trim())
      : destino.trim()
    : null;
  const parteDestino = destinoFormatado ? `Dirija-se ${destinoFormatado}.` : null;

  let partes: Array<string | null>;
  switch (template) {
    case "paciente_senha_fila_destino":
      partes = [partePaciente, parteSenha, parteFila, parteDestino];
      break;
    case "paciente_senha_destino":
      partes = [partePaciente, parteSenha, parteDestino];
      break;
    case "senha_destino":
      partes = [parteSenha, parteDestino];
      break;
    case "senha_fila":
      partes = [parteSenha, parteFila];
      break;
    case "paciente_senha_fila":
    default:
      partes = [partePaciente, parteSenha, parteFila];
      break;
  }

  return partes.filter(Boolean).join(" ").trim();
}
