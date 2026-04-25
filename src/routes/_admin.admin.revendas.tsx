import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, Plus, ShieldCheck } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";

export const Route = createFileRoute("/_admin/admin/revendas")({
  component: () => (
    <RoleGuard permission="manage_users" path="/admin/revendas">
      <RevendasPage />
    </RoleGuard>
  ),
});

function RevendasPage() {
  const { data: revendas, isLoading } = useQuery({
    queryKey: ["admin_revendas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revendas")
        .select(`
          *,
          unidades:unidades(count),
          usuarios:revenda_usuarios(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Painel de Revendas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie parceiros de revenda e as clínicas/unidades vinculadas a eles.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nova Revenda
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Revendas</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revendas?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clínicas via Revenda</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revendas?.reduce((acc, r: any) => acc + (r.unidades?.[0]?.count || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuários de Revenda</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revendas?.reduce((acc, r: any) => acc + (r.usuarios?.[0]?.count || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parceiros Cadastrados</CardTitle>
          <CardDescription>
            Lista de revendas ativas no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Clínicas</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    Carregando revendas...
                  </TableCell>
                </TableRow>
              ) : revendas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhuma revenda encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                revendas?.map((revenda: any) => (
                  <TableRow key={revenda.id}>
                    <TableCell className="font-medium">{revenda.nome}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span>{revenda.email_contato}</span>
                        <span className="text-muted-foreground">{revenda.telefone_contato}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{revenda.unidades?.[0]?.count || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{revenda.usuarios?.[0]?.count || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={revenda.ativa ? "success" : "destructive"} className="capitalize">
                        {revenda.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Editar</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
