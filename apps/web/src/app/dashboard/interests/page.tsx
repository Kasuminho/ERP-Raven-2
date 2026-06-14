'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useDeclareItemInterest, useItemInterests, useMarkItemInterestSeen, useUploadImage } from '@/hooks/use-guild-api';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { ItemInterestPost, ItemType } from '@/types/api';

const itemTypes: ItemType[] = ['WEAPON', 'ARMOR', 'ACCESSORY', 'CELESTIAL_STONE'];

function localDateKey(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function itemTypeLabel(type: ItemType): string {
  return type.replace('_', ' ');
}

export default function ItemInterestsPage() {
  const locale = useLocaleStore((state) => state.locale);
  const posts = useItemInterests('OPEN');
  const declareInterest = useDeclareItemInterest();
  const markSeen = useMarkItemInterestSeen();
  const uploadImage = useUploadImage();
  const [forms, setForms] = useState<Record<string, { note: string; imageUrl: string }>>({});
  const [typeFilter, setTypeFilter] = useState<'ALL' | ItemType>('ALL');
  const [createdDateFilter, setCreatedDateFilter] = useState('');
  const [hideDeclared, setHideDeclared] = useState(false);
  const [showSeen, setShowSeen] = useState(false);

  const updateForm = (postId: string, patch: Partial<{ note: string; imageUrl: string }>) => {
    setForms((current) => {
      const base = current[postId] ?? { note: '', imageUrl: '' };
      return { ...current, [postId]: { ...base, ...patch } };
    });
  };

  const filteredPosts = (posts.data ?? []).filter((post: ItemInterestPost) => {
    if (typeFilter !== 'ALL' && post.itemCatalog?.itemType !== typeFilter) return false;
    if (createdDateFilter && localDateKey(post.createdAt) !== createdDateFilter) return false;
    if (hideDeclared && post.viewerHasDeclared) return false;
    if (!showSeen && post.viewerSeenAt) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'itemBoard')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'openInterests')}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t(locale, 'interestDeclarationHelp')}</p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_1fr_auto] xl:grid-cols-[1fr_1fr_auto_auto_auto]">
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">{t(locale, 'filterByType')}</span>
            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'ALL' | ItemType)}>
              <option value="ALL">{t(locale, 'allTypes')}</option>
              {itemTypes.map((type) => (
                <option key={type} value={type}>{itemTypeLabel(type)}</option>
              ))}
            </Select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">{t(locale, 'filterByAddedDate')}</span>
            <Input type="date" value={createdDateFilter} onChange={(event) => setCreatedDateFilter(event.target.value)} />
          </label>
          <label className="flex items-center gap-2 self-end rounded-md border bg-background/35 px-3 py-2 text-sm text-muted-foreground">
            <input className="h-4 w-4 accent-primary" type="checkbox" checked={hideDeclared} onChange={(event) => setHideDeclared(event.target.checked)} />
            {t(locale, 'hideDeclaredInterests')}
          </label>
          <label className="flex items-center gap-2 self-end rounded-md border bg-background/35 px-3 py-2 text-sm text-muted-foreground">
            <input className="h-4 w-4 accent-primary" type="checkbox" checked={showSeen} onChange={(event) => setShowSeen(event.target.checked)} />
            {t(locale, 'showSeenInterests')}
          </label>
          <Button
            className="self-end"
            variant="secondary"
            onClick={() => {
              setTypeFilter('ALL');
              setCreatedDateFilter('');
              setHideDeclared(false);
              setShowSeen(false);
            }}
          >
            {t(locale, 'clearFilters')}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredPosts.map((post) => {
          const form = forms[post.id] ?? { note: '', imageUrl: '' };
          return (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>{post.title}</CardTitle>
                  <div className="flex flex-wrap justify-end gap-2">
                    {post.itemCatalog?.itemType && <Badge tone="blue">{itemTypeLabel(post.itemCatalog.itemType)}</Badge>}
                    {post.viewerHasDeclared && <Badge tone="green">{t(locale, 'interestAlreadyDeclared')}</Badge>}
                    {post.viewerSeenAt && <Badge tone="gold">{t(locale, 'seen')}</Badge>}
                    <Badge tone={post.status === 'OPEN' ? 'green' : 'gold'}>{post.status}</Badge>
                  </div>
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
                <p className="text-xs text-muted-foreground">{t(locale, 'addedAt')} {new Date(post.createdAt).toLocaleString()}</p>
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
                    {!post.viewerHasDeclared && !post.viewerSeenAt && (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={markSeen.isPending}
                        onClick={() => markSeen.mutate(post.id, { onSuccess: () => notifyToast({ title: t(locale, 'interestMarkedSeen'), tone: 'success' }) })}
                      >
                        {t(locale, 'markSeen')}
                      </Button>
                    )}
                  </div>
                )}
                {post.proofImageUrl && <a className="text-sm text-primary" href={post.proofImageUrl} target="_blank" rel="noreferrer">{t(locale, 'openDeliveryProof')}</a>}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {!posts.isLoading && filteredPosts.length === 0 && (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            {(posts.data ?? []).length === 0 ? t(locale, 'noOpenInterests') : t(locale, 'noInterestsForFilters')}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
