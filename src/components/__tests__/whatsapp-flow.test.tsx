import { render, screen, fireEvent } from "@testing-library/react";
import { WhatsAppFlow } from "../whatsapp-flow";
import { vi, describe, it, expect, beforeEach } from "vitest";
import * as analytics from "@/lib/analytics";

// Mock analytics
vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

describe("WhatsAppFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore
    window.open = vi.fn();
  });

  const fillForm = async (nome: string, unidade: string, tipo: string) => {
    // Step 1: Nome
    const openButton = screen.getByText(/Começar agora/i);
    fireEvent.click(openButton);
    
    const nomeInput = await screen.findByLabelText(/Qual o seu nome\?/i);
    fireEvent.change(nomeInput, { target: { value: nome } });
    
    const nextButton1 = screen.getByText(/Próximo/i);
    fireEvent.click(nextButton1);

    // Step 2: Unidade
    const unidadeInput = await screen.findByLabelText(/Nome da Clínica \/ Unidade/i);
    fireEvent.change(unidadeInput, { target: { value: unidade } });
    
    const nextButton2 = screen.getByText(/Próximo/i);
    fireEvent.click(nextButton2);

    // Step 3: Tipo
    const tipoButton = await screen.findByText(tipo === "Outro" ? "Outro" : tipo);
    fireEvent.click(tipoButton);

    if (tipo !== "Odontologia" && tipo !== "Estética" && tipo !== "Pronto Atendimento" && tipo !== "Clínica Médica" && tipo !== "Outro") {
        // This case is for the "Other" input if needed, but the predefined ones are easier
    }
    
    const finishButton = screen.getByText(/Finalizar e ir para WhatsApp/i);
    fireEvent.click(finishButton);
  };

  it("should assemble the correct message for Odontology", async () => {
    render(<WhatsAppFlow />);
    await fillForm("João Silva", "Clínica Sorriso", "Odontologia");

    const expectedMessage = "Olá! Meu nome é João Silva e sou da clínica Clínica Sorriso. Gostaria de entender como o FilaMed pode me ajudar a organizar melhor as consultas odontológicas e reduzir as faltas dos pacientes.";
    const encodedMessage = encodeURIComponent(expectedMessage);
    
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining(`text=${encodedMessage}`),
      "_blank"
    );
    expect(analytics.trackEvent).toHaveBeenCalledWith("form_submission", expect.any(Object));
  });

  it("should assemble the correct message for Aesthetics", async () => {
    render(<WhatsAppFlow />);
    await fillForm("Maria Oliveira", "Espaço Beleza", "Estética");

    const expectedMessage = "Olá! Meu nome é Maria Oliveira e sou da Espaço Beleza. Atuamos na área de estética e gostaria de saber como o FilaMed pode elevar a experiência dos nossos clientes e otimizar nossa agenda de procedimentos.";
    const encodedMessage = encodeURIComponent(expectedMessage);
    
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining(`text=${encodedMessage}`),
      "_blank"
    );
  });

  it("should assemble the correct message for ER/Pronto Atendimento", async () => {
    render(<WhatsAppFlow />);
    await fillForm("Dr. Carlos", "Hospital Central", "Pronto Atendimento");

    const expectedMessage = "Olá! Meu nome é Dr. Carlos e falo do Hospital Central. Temos um fluxo intenso de pronto atendimento e gostaria de saber como o FilaMed pode nos ajudar a gerenciar as filas de espera e o tempo de atendimento em tempo real.";
    const encodedMessage = encodeURIComponent(expectedMessage);
    
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining(`text=${encodedMessage}`),
      "_blank"
    );
  });

  it("should assemble a generic message for other types", async () => {
    render(<WhatsAppFlow />);
    await fillForm("Ana Costa", "Clínica Geral", "Clínica Médica");

    const expectedMessage = "Olá! Meu nome é Ana Costa. Gostaria de saber mais sobre como o FilaMed pode modernizar o atendimento da minha clínica (Clínica Geral), que atua na área de Clínica Médica.";
    const encodedMessage = encodeURIComponent(expectedMessage);
    
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining(`text=${encodedMessage}`),
      "_blank"
    );
  });

  it("should handle 'Outro' specialty with custom input", async () => {
    render(<WhatsAppFlow />);
    
    // Step 1
    const openButton = screen.getByText(/Começar agora/i);
    fireEvent.click(openButton);
    const nomeInput = await screen.findByLabelText(/Qual o seu nome\?/i);
    fireEvent.change(nomeInput, { target: { value: "Pedro" } });
    fireEvent.click(screen.getByText(/Próximo/i));

    // Step 2
    const unidadeInput = await screen.findByLabelText(/Nome da Clínica \/ Unidade/i);
    fireEvent.change(unidadeInput, { target: { value: "Clínica X" } });
    fireEvent.click(screen.getByText(/Próximo/i));

    // Step 3
    const outroButton = await screen.findByText("Outro");
    fireEvent.click(outroButton);
    
    const outroInput = screen.getByPlaceholderText(/Digite sua especialidade.../i);
    fireEvent.change(outroInput, { target: { value: "Fisioterapia" } });

    const finishButton = screen.getByText(/Finalizar e ir para WhatsApp/i);
    fireEvent.click(finishButton);

    const expectedMessage = "Olá! Meu nome é Pedro. Gostaria de saber mais sobre como o FilaMed pode modernizar o atendimento da minha clínica (Clínica X), que atua na área de Fisioterapia.";
    const encodedMessage = encodeURIComponent(expectedMessage);
    
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining(`text=${encodedMessage}`),
      "_blank"
    );
  });
});
