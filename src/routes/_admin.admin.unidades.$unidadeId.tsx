import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Building2,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Mic2,
  Tv,
  Users,
  CreditCard,
  AlertCircle,
  Activity,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 as LoaderIcon } from "lucide-react";
import type { AssinaturaStatus } from "@/hooks/use-auth";

export const Route = createFileRoute("/_admin/admin/unidades/$unidadeId")({
  head: () => ({
    meta: [{ title: "Admin · Detalhes da unidade — FilaMed" }],
  }),
  component: AdminUnidadeDetalhes,
});

interface UnidadeDetalhe {
  id: string;
  nome: string;
  slug: string;
  cnpj: string | null;
  telefone: string | null;
  endereco: string | null;
  ativo: boolean;
  status_assinatura: AssinaturaStatus;
  trial_ends_at: string;
  created_at: string;
}

interface IntegracaoStatus {
  tem_assinatura: boolean;
  plano_nome: string | null;
  status_assinatura: string | null;
  whatsapp_configurado: boolean;
  voz_configurada: boolean;
  tv_configurada: boolean;
  total_filas: number;
  total_usuarios: number;
  total_pacientes: number;
  total_senhas_30d: number;
  total_notificacoes_30d: number;
  notificacoes_falhas_30d: number;
  faturas_pendentes: number;
}

const STATUS_VARIANT: Record<AssinaturaStatus, { label: string; className: string }> = {
  trial: { label: "Trial", className: "bg-primary/10 text-primary border-primary/20" },
  ativo: { label: "Ativo", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  suspenso: { label: "Suspenso", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function AdminUnidadeDetalhes() {
  const { unidadeId } = Route.useParams();
  const [unidade, setUnidade] = useState<UnidadeDetalhe | null>(null);
  const [integracao, setIntegracao] = useState<IntegracaoStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      setLoading(true);
      const unidadeRes = await supabase
        .from("unidades")
        .select("id, nome, slug, cnpj, telefone, endereco, ativo, status_assinatura, trial_ends_at, created_at")
        .eq("id", unidadeId)
        .maybeSingle();
      const integracaoRes = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: IntegracaoStatus[] | null; error: unknown }>)(
        "admin_unidade_integracao_status",
        { _unidade_id: unidadeId },
      );
      if (cancel) return;
      if (unidadeRes.data) setUnidade(unidadeRes.data as UnidadeDetalhe);
      if (integracaoRes.data && integracaoRes.data.length > 0) {
        setIntegracao(integracaoRes.data[0]);
      }
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [unidadeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <LoaderIcon className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!unidade) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-muted-foreground">Unidade não encontrada.</p>
        <Button asChild className="mt-4">
          <Link to="/admin">Voltar</Link>
        </Button>
      </div>
    );
  }

  const variant = STATUS_VARIANT[unidade.status_assinatura];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/admin">
          <ArrowLeft className="h-4 w-4" />
          Voltar para unidades
        </Link>
      </Button>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{unidade.nome}</h1>
              <p className="font-mono text-xs text-muted-foreground">/{unidade.slug}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={variant.className}>
            {variant.label}
          </Badge>
          <Button asChild size="sm">
            <Link to="/admin/unidades/$unidadeId/assinatura" params={{ unidadeId: unidade.id }}>
              <CreditCard className="h-4 w-4" />
              Gerenciar assinatura
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna 1: Dados cadastrais */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Dados cadastrais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="CNPJ" value={unidade.cnpj} />
            <InfoRow label="Telefone" value={unidade.telefone} />
            <InfoRow label="Endereço" value={unidade.endereco} />
            <InfoRow label="Cadastrada em" value={fmtDate(unidade.created_at)} />
            <InfoRow
              label="Trial até"
              value={unidade.status_assinatura === "trial" ? fmtDate(unidade.trial_ends_at) : "—"}
            />
            <InfoRow label="Ativa" value={unidade.ativo ? "Sim" : "Não"} />
          </CardContent>
        </Card>

        {/* Coluna 2-3: Integrações */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Status de integração</CardTitle>
            <CardDescription>Configurações ativas e métricas dos últimos 30 dias.</CardDescription>
          </CardHeader>
          <CardContent>
            {integracao ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <IntegracaoCard
                  icon={CreditCard}
                  label="Assinatura"
                  status={integracao.tem_assinatura}
                  detail={
                    integracao.tem_assinatura
                      ? `${integracao.plano_nome ?? "—"} · ${integracao.status_assinatura ?? "—"}`
                      : "Sem assinatura"
                  }
                />
                <IntegracaoCard
                  icon={MessageCircle}
                  label="WhatsApp"
                  status={integracao.whatsapp_configurado}
                  detail={integracao.whatsapp_configurado ? "Configurado" : "Não configurado"}
                />
                <IntegracaoCard
                  icon={Mic2}
                  label="Voz / TTS"
                  status={integracao.voz_configurada}
                  detail={integracao.voz_configurada ? "Configurado" : "Padrão (browser)"}
                />
                <IntegracaoCard
                  icon={Tv}
                  label="TV / Painel"
                  status={integracao.tv_configurada}
                  detail={integracao.tv_configurada ? "Personalizado" : "Padrão"}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Não foi possível carregar status.</p>
            )}
          </CardContent>
        </Card>

        {/* Métricas operacionais */}
        {integracao && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Métricas operacionais</CardTitle>
              <CardDescription>Visão geral da operação da unidade.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricaCard icon={Users} label="Usuários cadastrados" value={integracao.total_usuarios} />
                <MetricaCard icon={Building2} label="Filas configuradas" value={integracao.total_filas} />
                <MetricaCard icon={Users} label="Pacientes cadastrados" value={integracao.total_pacientes} />
                <MetricaCard icon={Calendar} label="Senhas (30d)" value={integracao.total_senhas_30d} />
                <MetricaCard
                  icon={Activity}
                  label="Notificações (30d)"
                  value={integracao.total_notificacoes_30d}
                />
                <MetricaCard
                  icon={AlertCircle}
                  label="Notificações falhas (30d)"
                  value={integracao.notificacoes_falhas_30d}
                  highlight={integracao.notificacoes_falhas_30d > 0}
                />
                <MetricaCard
                  icon={CreditCard}
                  label="Faturas pendentes"
                  value={integracao.faturas_pendentes}
                  highlight={integracao.faturas_pendentes > 0}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

function IntegracaoCard({
  icon: Icon,
  label,
  status,
  detail,
}: {
  icon: typeof Building2;
  label: string;
  status: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          status ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {status ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function MetricaCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${highlight && value > 0 ? "text-destructive" : ""}`}>
        {value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
