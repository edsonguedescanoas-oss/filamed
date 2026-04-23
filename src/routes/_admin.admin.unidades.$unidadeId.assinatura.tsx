import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Receipt,
  RefreshCw,
  Ban,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type AssinaturaCiclo = Database["public"]["Enums"]["assinatura_ciclo"];
type AssinaturaEstado = Database["public"]["Enums"]["assinatura_estado"];
type FaturaStatus = Database["public"]["Enums"]["fatura_status"];

export const Route = createFileRoute("/_admin/admin/unidades/$unidadeId/assinatura")({
  head: () => ({
    meta: [{ title: "Admin · Assinatura — FilaMed" }],
  }),
  component: AdminAssinaturaPage,
});

interface AssinaturaDetalhe {
  assinatura_id: string;
  plano_id: string;
  plano_nome: string;
  plano_slug: string;
  ciclo: AssinaturaCiclo;
  status: AssinaturaEstado;
  inicio_em: string;
  proximo_ciclo_em: string | null;
  cancelada_em: string | null;
  cancelar_no_fim_do_ciclo: boolean;
  gateway: string | null;
  gateway_subscription_id: string | null;
  gateway_customer_id: string | null;
  metadata: Record<string, unknown> | null;
  preco_mensal_centavos: number;
  preco_anual_centavos: number | null;
  moeda: string;
}

interface FaturaRow {
  id: string;
  numero: string;
  linha_descricao: string;
  valor_centavos: number;
  moeda: string;
  status: FaturaStatus;
  vencimento: string;
  paga_em: string | null;
  url_recibo: string | null;
  metodo_pagamento: string | null;
  gateway_invoice_id: string | null;
  created_at: string;
}

interface PlanoOption {
  id: string;
  nome: string;
  slug: string;
  preco_mensal_centavos: number;
  preco_anual_centavos: number | null;
}

interface UnidadeBasica {
  nome: string;
  slug: string;
}

const STATUS_VARIANT: Record<AssinaturaEstado, { label: string; className: string }> = {
  trialing: { label: "Trial", className: "bg-primary/10 text-primary border-primary/20" },
  ativa: { label: "Ativa", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  inadimplente: { label: "Inadimplente", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  cancelada: { label: "Cancelada", className: "bg-destructive/10 text-destructive border-destructive/20" },
  pausada: { label: "Pausada", className: "bg-muted text-muted-foreground border-border" },
};

const FATURA_VARIANT: Record<FaturaStatus, { label: string; className: string }> = {
  aberta: { label: "Aberta", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  paga: { label: "Paga", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  falhou: { label: "Falhou", className: "bg-destructive/10 text-destructive border-destructive/20" },
  reembolsada: { label: "Reembolsada", className: "bg-muted text-muted-foreground border-border" },
  cancelada: { label: "Cancelada", className: "bg-muted text-muted-foreground border-border" },
};

function fmtMoney(centavos: number, moeda: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda || "BRL",
  }).format(centavos / 100);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminAssinaturaPage() {
  const { unidadeId } = Route.useParams();
  const [unidade, setUnidade] = useState<UnidadeBasica | null>(null);
  const [assinatura, setAssinatura] = useState<AssinaturaDetalhe | null>(null);
  const [faturas, setFaturas] = useState<FaturaRow[]>([]);
  const [planos, setPlanos] = useState<PlanoOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Diálogos
  const [editPlanoOpen, setEditPlanoOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [marcarPagaId, setMarcarPagaId] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);

    const rpc = supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;

    const [unidadeRes, assinaturaRes, faturasRes, planosRes] = await Promise.all([
      supabase.from("unidades").select("nome, slug").eq("id", unidadeId).maybeSingle(),
      rpc("admin_detalhe_assinatura", { _unidade_id: unidadeId }),
      rpc("admin_listar_faturas_unidade", { _unidade_id: unidadeId }),
      supabase
        .from("planos")
        .select("id, nome, slug, preco_mensal_centavos, preco_anual_centavos")
        .eq("ativo", true)
        .order("ordem"),
    ]);

    if (unidadeRes.data) setUnidade(unidadeRes.data as UnidadeBasica);

    const assinaturaRows = (assinaturaRes.data as AssinaturaDetalhe[] | null) ?? [];
    setAssinatura(assinaturaRows[0] ?? null);

    const faturasRows = (faturasRes.data as FaturaRow[] | null) ?? [];
    setFaturas(faturasRows);

    if (planosRes.data) setPlanos(planosRes.data as PlanoOption[]);

    setLoading(false);
  };

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeId]);

  const handleCancelar = async (imediato: boolean) => {
    const rpc = supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>;

    const { error } = await rpc("admin_cancelar_assinatura", {
      _unidade_id: unidadeId,
      _imediato: imediato,
    });

    if (error) {
      toast.error("Erro ao cancelar: " + error.message);
    } else {
      toast.success(
        imediato
          ? "Assinatura cancelada imediatamente"
          : "Assinatura será cancelada no fim do ciclo",
      );
      setCancelOpen(false);
      void carregar();
    }
  };

  const handleMarcarPaga = async () => {
    if (!marcarPagaId) return;
    const rpc = supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>;

    const { error } = await rpc("admin_marcar_fatura_paga", {
      _fatura_id: marcarPagaId,
      _metodo: "manual",
    });

    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success("Fatura marcada como paga");
      setMarcarPagaId(null);
      void carregar();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/admin/unidades/$unidadeId" params={{ unidadeId }}>
          <ArrowLeft className="h-4 w-4" />
          Voltar para a unidade
        </Link>
      </Button>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Assinatura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {unidade?.nome ?? "—"}{" "}
          <span className="font-mono text-xs">/{unidade?.slug}</span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Card principal: plano atual */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Plano atual
              </CardTitle>
              <CardDescription>Configuração da assinatura ativa.</CardDescription>
            </div>
            {assinatura && (
              <Badge variant="outline" className={STATUS_VARIANT[assinatura.status].className}>
                {STATUS_VARIANT[assinatura.status].label}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {assinatura ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Info label="Plano" value={assinatura.plano_nome} mono={false} />
                  <Info label="Slug" value={assinatura.plano_slug} mono />
                  <Info label="Ciclo" value={assinatura.ciclo === "anual" ? "Anual" : "Mensal"} />
                  <Info
                    label="Valor"
                    value={
                      assinatura.ciclo === "anual" && assinatura.preco_anual_centavos
                        ? fmtMoney(assinatura.preco_anual_centavos, assinatura.moeda) + "/ano"
                        : fmtMoney(assinatura.preco_mensal_centavos, assinatura.moeda) + "/mês"
                    }
                  />
                  <Info label="Início" value={fmtDate(assinatura.inicio_em)} />
                  <Info label="Próximo ciclo" value={fmtDate(assinatura.proximo_ciclo_em)} />
                  <Info label="Gateway" value={assinatura.gateway ?? "—"} />
                  <Info
                    label="Cancelamento agendado"
                    value={assinatura.cancelar_no_fim_do_ciclo ? "Sim, ao fim do ciclo" : "Não"}
                  />
                </div>

                {assinatura.cancelada_em && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                    <AlertCircle className="mr-2 inline h-4 w-4" />
                    Cancelada em {fmtDateTime(assinatura.cancelada_em)}
                  </div>
                )}

                {(assinatura.gateway_subscription_id || assinatura.gateway_customer_id) && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                    {assinatura.gateway_subscription_id && (
                      <div className="font-mono">
                        sub: {assinatura.gateway_subscription_id}
                      </div>
                    )}
                    {assinatura.gateway_customer_id && (
                      <div className="font-mono">
                        cust: {assinatura.gateway_customer_id}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button onClick={() => setEditPlanoOpen(true)}>
                    <RefreshCw className="h-4 w-4" />
                    Alterar plano / ciclo
                  </Button>
                  {assinatura.status !== "cancelada" && (
                    <Button variant="outline" onClick={() => setCancelOpen(true)}>
                      <Ban className="h-4 w-4" />
                      Cancelar assinatura
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Esta unidade ainda não tem assinatura cadastrada.
                </p>
                <Button onClick={() => setEditPlanoOpen(true)}>
                  <CreditCard className="h-4 w-4" />
                  Criar assinatura
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo lateral */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ResumoLinha
              label="Faturas pagas"
              value={faturas.filter((f) => f.status === "paga").length}
              icon={CheckCircle2}
              color="text-emerald-600"
            />
            <ResumoLinha
              label="Faturas em aberto"
              value={faturas.filter((f) => f.status === "aberta").length}
              icon={Calendar}
              color="text-amber-600"
            />
            <ResumoLinha
              label="Faturas falhas"
              value={faturas.filter((f) => f.status === "falhou").length}
              icon={XCircle}
              color="text-destructive"
            />
            <div className="border-t border-border pt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total recebido</span>
                <span className="font-semibold">
                  {fmtMoney(
                    faturas
                      .filter((f) => f.status === "paga")
                      .reduce((sum, f) => sum + f.valor_centavos, 0),
                    assinatura?.moeda ?? "BRL",
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de faturas */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5" />
              Histórico de pagamentos
            </CardTitle>
            <CardDescription>
              {faturas.length === 0
                ? "Nenhuma fatura registrada."
                : `${faturas.length} fatura(s) registrada(s).`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {faturas.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Sem faturas para esta unidade.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Paga em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faturas.map((f) => {
                      const variant = FATURA_VARIANT[f.status];
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="font-mono text-xs">{f.numero}</TableCell>
                          <TableCell className="max-w-[280px] truncate text-sm">
                            {f.linha_descricao}
                          </TableCell>
                          <TableCell className="font-medium">
                            {fmtMoney(f.valor_centavos, f.moeda)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={variant.className}>
                              {variant.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {fmtDate(f.vencimento)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {fmtDate(f.paga_em)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {f.url_recibo && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  asChild
                                  title="Ver recibo"
                                >
                                  <a
                                    href={f.url_recibo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              {(f.status === "aberta" || f.status === "falhou") && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setMarcarPagaId(f.id)}
                                  title="Marcar como paga"
                                  className="text-emerald-600 hover:text-emerald-700"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlterarPlanoDialog
        open={editPlanoOpen}
        onClose={() => setEditPlanoOpen(false)}
        unidadeId={unidadeId}
        atual={assinatura}
        planos={planos}
        onSaved={() => {
          setEditPlanoOpen(false);
          void carregar();
        }}
      />

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Você pode cancelar imediatamente (acesso bloqueado agora) ou agendar o cancelamento
              para o fim do ciclo atual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <Button variant="outline" onClick={() => void handleCancelar(false)}>
              Ao fim do ciclo
            </Button>
            <AlertDialogAction
              onClick={() => void handleCancelar(true)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar imediatamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!marcarPagaId} onOpenChange={(o) => !o && setMarcarPagaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar fatura como paga?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto registra o pagamento manualmente, fora do gateway. Use apenas para pagamentos
              recebidos por outros meios (PIX, transferência etc).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleMarcarPaga()}>
              Confirmar pagamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-medium ${mono ? "font-mono text-sm" : ""}`}>{value}</div>
    </div>
  );
}

function ResumoLinha({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof CheckCircle2;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className={`h-4 w-4 ${color}`} />
        {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function AlterarPlanoDialog({
  open,
  onClose,
  unidadeId,
  atual,
  planos,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  unidadeId: string;
  atual: AssinaturaDetalhe | null;
  planos: PlanoOption[];
  onSaved: () => void;
}) {
  const [planoId, setPlanoId] = useState<string>("");
  const [ciclo, setCiclo] = useState<AssinaturaCiclo>("mensal");
  const [status, setStatus] = useState<AssinaturaEstado>("ativa");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPlanoId(atual?.plano_id ?? planos[0]?.id ?? "");
      setCiclo(atual?.ciclo ?? "mensal");
      setStatus(atual?.status ?? "ativa");
    }
  }, [open, atual, planos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planoId) {
      toast.error("Selecione um plano");
      return;
    }
    setSaving(true);
    const rpc = supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>;

    const { error } = await rpc("admin_alterar_plano_assinatura", {
      _unidade_id: unidadeId,
      _plano_id: planoId,
      _ciclo: ciclo,
      _novo_status: status,
    });
    setSaving(false);

    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success("Assinatura atualizada");
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{atual ? "Alterar plano" : "Criar assinatura"}</DialogTitle>
          <DialogDescription>
            Defina o plano, ciclo de cobrança e status da assinatura.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Plano</Label>
            <Select value={planoId} onValueChange={setPlanoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {planos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} — {fmtMoney(p.preco_mensal_centavos, "BRL")}/mês
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Ciclo</Label>
              <Select value={ciclo} onValueChange={(v) => setCiclo(v as AssinaturaCiclo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AssinaturaEstado)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trialing">Trial</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="inadimplente">Inadimplente</SelectItem>
                  <SelectItem value="pausada">Pausada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
