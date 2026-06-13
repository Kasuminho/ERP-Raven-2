'use client';

import { MessageSquareText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDiscordTemplates } from '@/hooks/use-guild-api';

export default function StaffDiscordTemplatesPage() {
  const templates = useDiscordTemplates();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Discord</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Templates de postagem</h1>
        <p className="mt-2 text-sm text-muted-foreground">Mapa dos textos/embeds que o sistema dispara. Edicao visual pode virar a proxima etapa.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(templates.data?.templates ?? []).map((template) => (
          <Card key={template.key}>
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-primary" /> {template.title}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Badge tone="blue">{template.channel}</Badge>
              <p className="text-muted-foreground">{template.preview}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
