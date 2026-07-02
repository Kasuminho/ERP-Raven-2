'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useDeclareBulkItemInterests, useDeclareItemInterest, useItemInterests, useMarkItemInterestSeen } from '@/hooks/use-items-api';
import { useUploadImage } from '@/hooks/use-profile-api';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { ItemInterestPost, ItemType } from '@/types/api';

const itemTypes: ItemType[] = ['WEAPON', 'ARMOR', 'ACCESSORY', 'CELESTIAL_STONE'];
const TRANSMUTE_IMAGE_URL = '/transmutar.png';

type InterestForm = {
  note: string;
  imageUrl: string;
  useTransmute: boolean;
};

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
  const declareBulkInterests = useDeclareBulkItemInterests();
  const markSeen = useMarkItemInterestSeen();
  const uploadImage = useUploadImage();
  const [forms, setForms] = useState<Record<string, InterestForm>>({});
  const [transmuteConfirmationPostId, setTransmuteConfirmationPostId] = useState<string>();
  const [batchConfirmationOpen, setBatchConfirmationOpen] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<'ALL' | ItemType>('ALL');
  const [createdDateFilter, setCreatedDateFilter] = useState('');
  const [hideDeclared, setHideDeclared] = useState(false);
  const [showSeen, setShowSeen] = useState(false);

  const updateForm = (postId: string, patch: Partial<InterestForm>) => {
    setForms((current) => {
      const base = current[postId] ?? { note: '', imageUrl: '', useTransmute: false };
      return { ...current, [postId]: { ...base, ...patch } };
    });
  };

  const declarePostInterest = (postId: string) => {
    const form = forms[postId] ?? { note: '', imageUrl: '', useTransmute: false };
    const imageUrl = form.useTransmute ? TRANSMUTE_IMAGE_URL : form.imageUrl;

    declareInterest.mutate(
      { postId, note: form.note, imageUrl, isTransmuteRequest: form.useTransmute },
      {
        onSuccess: () => {
          updateForm(postId, { note: '', imageUrl: '', useTransmute: false });
          setTransmuteConfirmationPostId(undefined);
          notifyToast({ title: t(locale, 'itemInterestDeclared'), tone: 'success' });
        },
      },
    );
  };

  const formForPost = (postId: string): InterestForm => forms[postId] ?? { note: '', imageUrl: '', useTransmute: false };

  const declarationPayloadForPost = (postId: string) => {
    const form = formForPost(postId);
    return {
      postId,
      note: form.note,
      imageUrl: form.useTransmute ? TRANSMUTE_IMAGE_URL : form.imageUrl,
      isTransmuteRequest: form.useTransmute,
    };
  };

  const canDeclarePost = (postId: string): boolean => {
    const form = formForPost(postId);
    return form.useTransmute || Boolean(form.imageUrl);
  };

  const toggleBatchSelection = (postId: string, checked: boolean) => {
    setSelectedPostIds((current) => checked
      ? [...new Set([...current, postId])]
      : current.filter((id) => id !== postId));
  };

  const filteredPosts = (posts.data ?? []).filter((post: ItemInterestPost) => {
    if (typeFilter !== 'ALL' && post.itemCatalog?.itemType !== typeFilter) return false;
    if (createdDateFilter && localDateKey(post.createdAt) !== createdDateFilter) return false;
    if (hideDeclared && post.viewerHasDeclared) return false;
    if (!showSeen && post.viewerSeenAt) return false;

    return true;
  });
  const selectedPosts = filteredPosts.filter((post) => selectedPostIds.includes(post.id) && !post.viewerHasDeclared);
  const selectedReadyPosts = selectedPosts.filter((post) => canDeclarePost(post.id));
  const selectedMissingProof = selectedPosts.length - selectedReadyPosts.length;

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

      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
          <div>
            <p className="font-semibold">{t(locale, 'batchInterests')}</p>
            <p className="text-sm text-muted-foreground">{t(locale, 'batchInterestsHelp')}</p>
          </div>
          <Badge tone={selectedPosts.length > 0 ? 'blue' : 'muted'}>{selectedPosts.length} {t(locale, 'selectedInterests')}</Badge>
          <Button
            variant="secondary"
            onClick={() => setSelectedPostIds(filteredPosts.filter((post) => !post.viewerHasDeclared && canDeclarePost(post.id)).map((post) => post.id))}
          >
            {t(locale, 'selectReadyInterests')}
          </Button>
          <Button variant="secondary" onClick={() => setSelectedPostIds([])}>{t(locale, 'clearSelection')}</Button>
          {selectedMissingProof > 0 && (
            <p className="text-sm text-yellow-200 lg:col-span-4">{selectedMissingProof} {t(locale, 'batchMissingProof')}</p>
          )}
          {selectedPosts.length > 0 && (
            <div className="flex flex-wrap gap-2 lg:col-span-4">
              {selectedPosts.map((post) => (
                <Badge key={post.id} tone={canDeclarePost(post.id) ? 'green' : 'gold'}>{post.title}</Badge>
              ))}
            </div>
          )}
          <Button
            className="lg:col-start-4"
            disabled={selectedPosts.length === 0 || selectedMissingProof > 0 || declareBulkInterests.isPending || uploadImage.isPending}
            onClick={() => setBatchConfirmationOpen(true)}
          >
            {t(locale, 'declareSelectedInterests')}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredPosts.map((post) => {
          const form = forms[post.id] ?? { note: '', imageUrl: '', useTransmute: false };
          const isEquipment = post.itemCatalog?.kind?.trim().toLowerCase() !== 'skill';
          const canDeclare = form.useTransmute || Boolean(form.imageUrl);

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
                    {!post.viewerHasDeclared && (
                      <label className="flex items-center gap-2 rounded-md border bg-background/35 px-3 py-2 text-sm text-muted-foreground">
                        <input
                          className="h-4 w-4 accent-primary"
                          type="checkbox"
                          checked={selectedPostIds.includes(post.id)}
                          onChange={(event) => toggleBatchSelection(post.id, event.target.checked)}
                        />
                        {t(locale, 'selectForBatch')}
                      </label>
                    )}
                    <Input placeholder={t(locale, 'optionalNote')} value={form.note} onChange={(event) => updateForm(post.id, { note: event.target.value })} />
                    {isEquipment && (
                      <label className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
                        <input
                          className="mt-1 h-4 w-4 shrink-0 accent-primary"
                          type="checkbox"
                          checked={form.useTransmute}
                          onChange={(event) => updateForm(post.id, { useTransmute: event.target.checked })}
                        />
                        <span>
                          <span className="block font-semibold text-foreground">{t(locale, 'transmuteInterestLabel')}</span>
                          <span className="block text-muted-foreground">{t(locale, 'transmuteInterestHelp')}</span>
                        </span>
                      </label>
                    )}
                    {form.useTransmute ? (
                      <div className="space-y-2">
                        <img className="aspect-video rounded-md border object-cover" src={TRANSMUTE_IMAGE_URL} alt={t(locale, 'transmuteInterestLabel')} />
                        <p className="text-center text-xs text-primary">{t(locale, 'transmutePrintSelected')}</p>
                      </div>
                    ) : (
                      <>
                        <p className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary">{t(locale, 'interestPrintHelp')}</p>
                        <FileUploadButton
                          label={t(locale, 'attachImage')}
                          onFileSelect={(files) => {
                            const file = files?.[0];
                            if (file) uploadImage.mutate(file, { onSuccess: (data) => updateForm(post.id, { imageUrl: data.url }) });
                          }}
                        />
                        {form.imageUrl && <p className="text-center text-xs text-primary">{t(locale, 'printAttached')}</p>}
                      </>
                    )}
                    <Button
                      disabled={!canDeclare || uploadImage.isPending || declareInterest.isPending}
                      onClick={() => (form.useTransmute ? setTransmuteConfirmationPostId(post.id) : declarePostInterest(post.id))}
                    >
                      {t(locale, 'declareInterest')}
                    </Button>
                    {!post.viewerHasDeclared && (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={Boolean(post.viewerSeenAt) || markSeen.isPending}
                        onClick={() => markSeen.mutate(post.id, { onSuccess: () => notifyToast({ title: t(locale, 'interestMarkedSeen'), tone: 'success' }) })}
                      >
                        {post.viewerSeenAt ? t(locale, 'seen') : t(locale, 'markSeen')}
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
      <ConfirmationDialog
        open={Boolean(transmuteConfirmationPostId)}
        title={t(locale, 'transmuteConfirmTitle')}
        description={t(locale, 'transmuteConfirmDescription')}
        confirmLabel={t(locale, 'declareInterest')}
        pending={declareInterest.isPending}
        tone="primary"
        onClose={() => setTransmuteConfirmationPostId(undefined)}
        onConfirm={() => {
          if (transmuteConfirmationPostId) declarePostInterest(transmuteConfirmationPostId);
        }}
      />
      <ConfirmationDialog
        open={batchConfirmationOpen}
        title={t(locale, 'batchConfirmTitle')}
        description={`${t(locale, 'batchConfirmDescription')} ${selectedReadyPosts.map((post) => post.title).join(', ')}`}
        confirmLabel={t(locale, 'declareSelectedInterests')}
        pending={declareBulkInterests.isPending}
        tone="primary"
        onClose={() => setBatchConfirmationOpen(false)}
        onConfirm={() => {
          const rows = selectedReadyPosts.map((post) => declarationPayloadForPost(post.id));
          declareBulkInterests.mutate(rows, {
            onSuccess: () => {
              setForms((current) => {
                const next = { ...current };
                for (const row of rows) {
                  next[row.postId] = { note: '', imageUrl: '', useTransmute: false };
                }
                return next;
              });
              setSelectedPostIds((current) => current.filter((id) => !rows.some((row) => row.postId === id)));
              setBatchConfirmationOpen(false);
              notifyToast({ title: t(locale, 'batchDeclaredSuccess'), tone: 'success' });
            },
          });
        }}
      />
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
