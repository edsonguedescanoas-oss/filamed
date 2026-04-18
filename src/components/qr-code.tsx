import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type Props = {
  /** URL ou texto a ser codificado. Se vazio/nulo, o componente não renderiza. */
  value: string | null | undefined;
  /** Tamanho em pixels (lado). Default 96. */
  size?: number;
  /** Classe extra para o wrapper. */
  className?: string;
  /** Cor escura do QR (default preto). */
  dark?: string;
  /** Cor clara/fundo do QR (default branco). */
  light?: string;
  /** Texto pequeno mostrado abaixo do QR. */
  caption?: string;
};

/**
 * QR Code renderizado em <canvas>. Recalcula só quando `value`/`size` muda.
 */
export function QrCode({
  value,
  size = 96,
  className,
  dark = "#0f172a",
  light = "#ffffff",
  caption,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    let cancelled = false;
    void QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark, light },
    }).then(() => {
      if (!cancelled) setReady(true);
    }).catch(() => {
      /* silencioso — QR opcional */
    });
    return () => {
      cancelled = true;
    };
  }, [value, size, dark, light]);

  if (!value) return null;

  return (
    <div className={className}>
      <div
        className="rounded-lg bg-white p-1.5 shadow-md"
        style={{ width: size + 12, height: size + 12 }}
      >
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          style={{ width: size, height: size, display: ready ? "block" : "none" }}
        />
      </div>
      {caption && (
        <div className="mt-1 text-center text-[10px] font-medium text-white/80">
          {caption}
        </div>
      )}
    </div>
  );
}
