/**
 * Cliente centralizado para integração com a API do WADUK (WhatsApp API)
 * Utiliza variáveis de ambiente seguras para autenticação.
 */

interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface TemplateParams {
  [key: string]: string;
}

export class WadukClient {
  private apiUrl: string;
  private apiKey: string;
  private instanceId: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_WADUK_API_URL || 'https://api.waduk.io/v1';
    this.apiKey = import.meta.env.VITE_WADUK_API_KEY || '';
    this.instanceId = import.meta.env.VITE_WADUK_INSTANCE_ID || '';
  }

  private async request(endpoint: string, method: string = 'GET', body?: any) {
    if (!this.apiKey || !this.instanceId) {
      console.error('[WadukClient] Credenciais ausentes (API_KEY ou INSTANCE_ID)');
      throw new Error('Configuração do WhatsApp incompleta');
    }

    const response = await fetch(`${this.apiUrl}/${this.instanceId}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro na comunicação com WADUK');
    }

    return response.json();
  }

  /**
   * Envia uma mensagem de texto simples
   */
  async enviarMensagemTexto(numero: string, mensagem: string): Promise<SendMessageResponse> {
    try {
      const data = await this.request('/messages/text', 'POST', {
        to: this.formatNumber(numero),
        text: mensagem,
      });
      return { success: true, messageId: data.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Envia um template de mensagem aprovado
   */
  async enviarTemplate(numero: string, templateNome: string, parametros: TemplateParams): Promise<SendMessageResponse> {
    try {
      const data = await this.request('/messages/template', 'POST', {
        to: this.formatNumber(numero),
        template: templateNome,
        components: Object.entries(parametros).map(([key, value]) => ({
          type: 'text',
          text: value
        }))
      });
      return { success: true, messageId: data.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Envia mídias (imagem, documento, vídeo)
   */
  async enviarMidia(
    numero: string, 
    tipo: 'imagem' | 'documento' | 'video', 
    url: string, 
    legenda?: string
  ): Promise<SendMessageResponse> {
    const endpointMap = {
      imagem: '/messages/image',
      documento: '/messages/document',
      video: '/messages/video'
    };

    try {
      const data = await this.request(endpointMap[tipo], 'POST', {
        to: this.formatNumber(numero),
        url,
        caption: legenda
      });
      return { success: true, messageId: data.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Verifica se o número é válido no WhatsApp
   */
  async verificarStatusNumero(numero: string): Promise<{ exists: boolean }> {
    try {
      const data = await this.request(`/contacts/check?number=${this.formatNumber(numero)}`);
      return { exists: data.exists };
    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * Lista modelos de templates disponíveis
   */
  async obterModelosTemplates(): Promise<any[]> {
    try {
      const data = await this.request('/templates');
      return data.templates || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Formata número para o padrão internacional (DDI + DDD + Número)
   */
  private formatNumber(numero: string): string {
    const clean = numero.replace(/\D/g, '');
    return clean.startsWith('55') ? clean : `55${clean}`;
  }
}

export const wadukClient = new WadukClient();
