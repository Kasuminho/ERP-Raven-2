'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import { useDeclareItemInterest, useItemInterests, useUploadImage } from '@/hooks/use-guild-api';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

export default function ItemInterestsPage() {
  const locale = useLocaleStore((state) => state.locale);
  const posts = useItemInterests('OPEN');
  const declareInterest = useDeclareItemInterest();
  const uploadImage = useUploadImage();
  const [forms, setForms] = useState<Record<string, { note: string; imageUrl: string }>>({});

  const updateForm = (postId: string, patch: Partial<{ note: string; imageUrl: string }>) => {
    setForms((current) => {
      const base = current[postId] ?? { note: '', imageUrl: '' };
      return { ...current, [postId]: { ...base, ...patch } };
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'itemBoard')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'openInterests')}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t(locale, 'interestDeclarationHelp')}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {(posts.data ?? []).map((post) => {
          const form = forms[post.id] ?? { note: '', imageUrl: '' };
          return (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>{post.title}</CardTitle>
                  <Badge tone={post.status === 'OPEN' ? 'green' : 'gold'}>{post.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {post.itemCatalog?.image1Url && <img className="aspect-video rounded-md border object-cover" src={displayImageUrl(post.itemCatalog.image1Url)} alt={post.title} />}
                  {post.itemCatalog?.image2Url && <img className="aspect-video rounded-md border object-cover" src={displayImageUrl(post.itemCatalog.image2Url)} alt={post.title} />}
                </div>
                <div className="rounded-md border bg-background/35 p-3 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">{t(locale, 'criteria')} {post.mode}</p>
                  <pre className="mt-2 whitespace-pre-wrap font-sans">{locale === 'en' ? post.criteriaEn : post.criteriaPt}</pre>
                </div>
                <p className="text-sm text-muted-foreground">{t(locale, 'closesAt')} {new Date(post.closesAt).toLocaleString()}</p>
                {post.status === 'OPEN' && (
                  <div className="space-y-3">
                    <Input placeholder={t(locale, 'optionalNote')} value={form.note} onChange={(event) => updateForm(post.id, { note: event.target.value })} />
                    <p className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary">{t(locale, 'interestPrintHelp')}</p>
                    <FileUploadButton
                      label={t(locale, 'attachImage')}
                      onFileSelect={(files) => {
                        const file = files?.[0];
                        if (file) uploadImage.mutate(file, { onSuccess: (data) => updateForm(post.id, { imageUrl: data.url }) });
                      }}
                    />
                    {form.imageUrl && <p className="text-center text-xs text-primary">{t(locale, 'printAttached')}</p>}
                    <Button
                      disabled={!form.imageUrl || uploadImage.isPending || declareInterest.isPending}
                      onClick={() => declareInterest.mutate(
                        { postId: post.id, note: form.note, imageUrl: form.imageUrl },
                        {
                          onSuccess: () => {
                            updateForm(post.id, { note: '', imageUrl: '' });
                            notifyToast({ title: t(locale, 'itemInterestDeclared'), tone: 'success' });
                          },
                        },
                      )}
                    >
                      {t(locale, 'declareInterest')}
                    </Button>
                  </div>
                )}
                {post.proofImageUrl && <a className="text-sm text-primary" href={post.proofImageUrl} target="_blank" rel="noreferrer">{t(locale, 'openDeliveryProof')}</a>}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {!posts.isLoading && (posts.data ?? []).length === 0 && (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            {t(locale, 'noOpenInterests')}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
