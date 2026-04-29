import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WadukTemplatePreviewProps {
  template: string;
  variables: Record<string, string>;
}

export function WadukTemplatePreview({ template, variables }: WadukTemplatePreviewProps) {
  const [preview, setPreview] = useState(template);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    validateAndPreview();
  }, [template, variables]);

  const validateAndPreview = () => {
    let result = template;
    const foundVariables = template.match(/{{(.*?)}}/g) || [];
    const currentErrors: string[] = [];
    const currentWarnings: string[] = [];

    // Validation: Unbalanced braces
    const openBraces = (template.match(/{/g) || []).length;
    const closeBraces = (template.match(/}/g) || []).length;
    if (openBraces !== closeBraces || openBraces % 2 !== 0) {
      currentErrors.push('Possível erro de formatação nas chaves {{ }}');
    }

    // Replace variables and check for missing ones
    foundVariables.forEach(v => {
      const varName = v.replace('{{', '').replace('}}', '').trim();
      if (variables[varName] !== undefined) {
        result = result.replace(v, variables[varName]);
      } else {
        currentWarnings.push(`Variável "${varName}" não possui valor de exemplo.`);
        result = result.replace(v, `<span class="text-destructive font-bold">[${varName}]</span>`);
      }
    });

    setPreview(result);
    setErrors(currentErrors);
    setWarnings(currentWarnings);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-muted/50 overflow-hidden border-dashed">
        <CardHeader className="py-3 px-4 bg-muted/80">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Pré-visualização (Simulado)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex justify-center bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
          <div className="relative max-w-[85%] bg-white dark:bg-[#0b141a] rounded-lg p-3 shadow-sm self-start">
            <div 
              className="text-sm whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: preview.replace(/\n/g, '<br/>') }}
            />
            <div className="text-[10px] text-muted-foreground text-right mt-1">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            {/* WhatsApp tail */}
            <div className="absolute left-[-8px] top-0 w-4 h-4 bg-white dark:bg-[#0b141a] [clip-path:polygon(100%_0,0_0,100%_100%)]"></div>
          </div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro Crítico</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-2">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-400">Atenção</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-500">
            <ul className="list-disc pl-4 mt-2">
              {warnings.map((warn, i) => <li key={i}>{warn}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {errors.length === 0 && warnings.length === 0 && (
        <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-md border border-emerald-100 dark:border-emerald-900">
          <CheckCircle2 className="h-4 w-4" />
          <span>Template validado e pronto para produção.</span>
        </div>
      )}
    </div>
  );
}
