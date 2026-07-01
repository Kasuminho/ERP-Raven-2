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
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">Preview de webhooks</h1>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {(templates.data?.templates ?? []).map((template) => (
          <Card key={template.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-primary" /> {template.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge tone="blue">{template.channel}</Badge>
                <Badge tone={template.playerFacing ? 'green' : 'gold'}>{template.playerFacing ? 'Players PT-BR/EN' : 'Staff PT-BR'}</Badge>
              </div>
              <p className="text-muted-foreground">{template.preview}</p>
              <div className="space-y-3">
                {template.previews.map((preview) => (
                  <div key={`${template.key}-${preview.locale}`} className="rounded-md border bg-background/35 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {preview.payload.avatar_url ? <img src={preview.payload.avatar_url} alt="" className="h-7 w-7 rounded-full border" /> : null}
                        <div>
                          <p className="font-semibold">{preview.payload.username}</p>
                          <p className="text-xs text-muted-foreground">{preview.label}</p>
                        </div>
                      </div>
                      {preview.payload.allowed_mentions ? <Badge tone="muted">mentions</Badge> : null}
                    </div>
                    {preview.payload.content ? (
                      <p className="mb-3 whitespace-pre-wrap rounded border bg-background/45 p-2 text-xs text-muted-foreground">{preview.payload.content}</p>
                    ) : null}
                    <div className="space-y-2">
                      {(preview.payload.embeds ?? []).map((embed, index) => (
                        <div
                          key={`${template.key}-${preview.locale}-${index}`}
                          className="rounded-md border-l-4 bg-background/50 p-3"
                          style={{ borderLeftColor: embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : undefined }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              {embed.title ? <p className="font-semibold">{embed.title}</p> : null}
                              {embed.description ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{embed.description}</p> : null}
                            </div>
                            {embed.thumbnail?.url ? <img src={embed.thumbnail.url} alt="" className="h-12 w-12 rounded border object-cover" /> : null}
                          </div>
                          {embed.fields && embed.fields.length > 0 ? (
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {embed.fields.map((field) => (
                                <div key={`${field.name}-${field.value}`} className={field.inline ? '' : 'sm:col-span-2'}>
                                  <p className="text-xs font-semibold uppercase text-muted-foreground">{field.name}</p>
                                  <p className="whitespace-pre-wrap text-sm">{field.value}</p>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          {embed.image?.url ? <img src={embed.image.url} alt="" className="mt-3 max-h-44 rounded border object-cover" /> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {!templates.isLoading && (templates.data?.templates ?? []).length === 0 && (
          <p className="rounded-md border bg-background/35 p-4 text-sm text-muted-foreground">Nenhum template encontrado.</p>
        )}
      </div>
    </div>
  );
}
