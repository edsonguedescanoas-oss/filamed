import { BotaoChamada as SharedBotaoChamada } from "@/components/shared/BotaoChamada";
import { ComponentProps } from "react";

type SharedProps = ComponentProps<typeof SharedBotaoChamada>;

export function BotaoChamada(props: Omit<SharedProps, "variant">) {
  return <SharedBotaoChamada {...props} variant="tv" />;
}
