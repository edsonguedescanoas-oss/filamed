# Documentação CRM Operação SaaS - Filamed

## Visão Geral
O sistema de CRM da Filamed foi projetado para gerenciar o ciclo de vida completo do lead, desde a captura inicial até o fechamento da venda, com automações multicanal (WhatsApp e E-mail).

## Configuração do WADUK
1. Obtenha sua `API_KEY` e `INSTANCE_ID` no painel do WADUK.
2. Configure as variáveis de ambiente no Supabase Cloud.
3. Certifique-se de que a instância do WhatsApp está conectada no celular.

## Landing Pages e Formulários
- Use o componente `PublicLeadForm.tsx` para capturar leads externamente.
- O formulário envia dados diretamente para a tabela `leads` via API pública.

## Workflows e Cadências
- **Workflows**: Gatilhos baseados em eventos do banco de dados (ex: Lead inserido).
- **Cadências**: Sequências temporizadas de contato (Dia 0, Dia 2, etc.). Configure-as no menu "Cadências" do dashboard comercial.

## Boas Práticas de Follow-up
- Tente o primeiro contato em menos de 5 minutos (Workflow automático).
- Alterne entre canais (WhatsApp de manhã, E-mail à tarde).
- Use cadências de 14 dias para leads frios.

## FAQ & Troubleshooting
- **WhatsApp não envia**: Verifique se a instância no WADUK está "Online".
- **E-mails não chegam**: Verifique as credenciais SMTP nas variáveis de ambiente.
- **Erro de Permissão**: Certifique-se de que o usuário tem a role `admin` ou `comercial` nos metadados do Supabase.
