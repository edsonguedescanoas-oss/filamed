function entidadeMeta(entidade: string, acao: string) {
  if (entidade === "usuario") {
    return {
      icon: UserIcon,
      label: "Usuário",
      tone: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    };
  }
  if (entidade === "fila") {
    return {
      icon: ListTree,
      label: "Fila",
      tone: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
    };
  }
  if (entidade === "chamada") {
    return {
      icon: PhoneCall,
      label: "Chamada",
      tone: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
    };
  }
  if (entidade === "notificacao") {
    if (acao === "falhar") {
      return {
        icon: AlertTriangle,
        label: "Notificação (falha)",
        tone: "bg-destructive/10 text-destructive border-destructive/20",
      };
    }
    return {
      icon: Send,
      label: "Notificação",
      tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    };
  }
  if (entidade === "assinatura") {
    return {
      icon: CreditCard,
      label: "Assinatura",
      tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    };
  }
  if (entidade === "unidade") {
    const isSuspender = acao === "suspender";
    return {
      icon: Power,
      label: isSuspender ? "Unidade suspensa" : "Unidade",
      tone: isSuspender
        ? "bg-destructive/10 text-destructive border-destructive/20"
        : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
    };
  }
  return {
    icon: Activity,
    label: entidade,
    tone: "bg-muted text-muted-foreground border-border",
  };
}