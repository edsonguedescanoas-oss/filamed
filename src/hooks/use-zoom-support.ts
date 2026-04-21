import { useEffect, useState } from "react";

/**
 * Detecta se o ambiente suporta a propriedade CSS `zoom` (não-padrão, mas
 * amplamente disponível em Chromium/WebKit e em Firefox 126+).
 *
 * Em ambientes que não suportam — Firefox antigo, alguns WebViews de TV
 * (Tizen/WebOS antigos), Firestick com Silk antigo, etc. — caímos para
 * `transform: scale()` com compensação de largura/altura, garantindo que
 * a escala seja sempre aplicada corretamente.
 *
 * A detecção é feita criando um elemento com `zoom: 2`, medindo o
 * `getBoundingClientRect()` e verificando se o navegador realmente
 * dimensionou o conteúdo. Mais confiável que `CSS.supports("zoom", "2")`,
 * que retorna `true` em alguns navegadores onde a propriedade é parseada
 * mas não aplicada.
 */
export function useZoomSupport(): boolean {
  // Default `true` no SSR e no primeiro paint para evitar flash em
  // navegadores modernos. Se a detecção falhar, troca pra `false`.
  const [supported, setSupported] = useState<boolean>(true);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    try {
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:absolute;left:-9999px;top:-9999px;width:100px;height:100px;zoom:2;pointer-events:none;visibility:hidden;";
      document.body.appendChild(probe);
      // Força layout
      const rect = probe.getBoundingClientRect();
      document.body.removeChild(probe);

      // Se `zoom` foi aplicado, o elemento de 100×100 vai medir ≈200×200.
      // Margem generosa pra cobrir arredondamentos e zoom de página.
      const works = rect.width >= 150 && rect.height >= 150;
      setSupported(works);
    } catch {
      // Se algo deu errado na sondagem, assumimos não suportado pra ir no
      // caminho seguro (transform: scale com compensação).
      setSupported(false);
    }
  }, []);

  return supported;
}

/**
 * Retorna estilos CSS prontos pra escalar um container, escolhendo entre
 * `zoom` (ideal — escala layout, fontes, paddings, e ainda permite que o
 * conteúdo flua naturalmente) e `transform: scale()` (fallback — precisa
 * de compensação de largura/altura pra ocupar o viewport todo, e o
 * `transform-origin` precisa estar no canto superior esquerdo).
 */
export function buildScaleStyle(
  scale: number,
  zoomSupported: boolean,
): React.CSSProperties {
  if (zoomSupported) {
    return { zoom: scale } as React.CSSProperties;
  }
  // Fallback: transform: scale com compensação. O elemento "cresce" para
  // 1/scale do viewport, depois é encolhido de volta — resultado visual
  // idêntico ao `zoom`, mas funciona em qualquer navegador.
  const inv = 1 / scale;
  return {
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    width: `${inv * 100}%`,
    // `min-height` em vez de `height` pra não cortar conteúdo dinâmico.
    minHeight: `${inv * 100}vh`,
  };
}
