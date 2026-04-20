const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;

  return (
    <div className="w-full border-b border-primary/30 bg-primary/10 px-4 py-2 text-center text-sm text-foreground">
      <span className="mr-1 inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
      Modo de teste — pagamentos no preview não cobram cartão real.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline"
      >
        Saiba mais
      </a>
    </div>
  );
}
