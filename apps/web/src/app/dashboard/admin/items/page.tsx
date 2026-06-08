'use client';

import { useMemo, useState } from 'react';
import { Check, Filter, Gavel, HandHeart, ImagePlus, PackagePlus, Pencil, Search, Wand2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useCreateBulkItemInterests, useCreateItem, useCreateItemAuctions, useCreateItemInterest, useItems, useUpdateItem, useUploadImage } from '@/hooks/use-guild-api';
import { itemName, itemTypeName } from '@/lib/game-labels';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { ItemCatalog, ItemTier, ItemType } from '@/types/api';

const tiers: ItemTier[] = ['T2', 'T3', 'T4', 'LEGENDARY'];
const itemTypes: ItemType[] = ['WEAPON', 'ARMOR', 'ACCESSORY', 'CELESTIAL_STONE'];
const kinds = ['equipment', 'skill', 'material', 'request'];
const categories = ['rare', 'heroic', 'legendary', 'relic', 'blueprint', 'creature'];

const tierCategory: Record<ItemTier, string> = {
  T2: 'rare',
  T3: 'rare',
  T4: 'heroic',
  LEGENDARY: 'legendary',
};

type ItemForm = {
  kind: string;
  category?: string;
  itemTier: ItemTier;
  itemType: ItemType;
  namePt: string;
  nameEn: string;
  nameEs: string;
  typePt: string;
  typeEn: string;
  typeEs: string;
  image1Url: string;
  image2Url: string;
  isActive?: boolean;
};

export default function AdminItemsPage() {
  const locale = useLocaleStore((state) => state.locale);
  const items = useItems();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const createAuctions = useCreateItemAuctions();
  const createInterest = useCreateItemInterest();
  const createBulkInterest = useCreateBulkItemInterests();
  const uploadImage = useUploadImage();
  const [form, setForm] = useState<ItemForm>({
    kind: 'equipment',
    itemTier: 'T4',
    itemType: 'WEAPON',
    namePt: '',
    nameEn: '',
    nameEs: '',
    typePt: '',
    typeEn: '',
    typeEs: '',
    image1Url: '',
    image2Url: '',
  });
  const [auctionQuantities, setAuctionQuantities] = useState<Record<string, number>>({});
  const [editingItemId, setEditingItemId] = useState('');
  const [editForms, setEditForms] = useState<Record<string, Required<ItemForm>>>({});
  const [filters, setFilters] = useState({
    search: '',
    tier: 'all',
    type: 'all',
    kind: 'all',
    category: 'all',
    active: 'all',
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkForm, setBulkForm] = useState({
    itemTier: 'keep',
    itemType: 'keep',
    category: 'keep',
    isActive: 'keep',
  });
  const [operationMode, setOperationMode] = useState<'auction' | 'interest'>('auction');
  const [interestForm, setInterestForm] = useState({
    mode: 'PvE' as 'PvE' | 'PvP',
    closesAt: '',
  });
  const catalog = useMemo(() => items.data ?? [], [items.data]);
  const dynamicCategories = useMemo(
    () => Array.from(new Set([...categories, ...catalog.map((item) => item.category).filter(Boolean)])).sort(),
    [catalog],
  );
  const filteredCatalog = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return catalog.filter((item) => {
      const searchable = [item.namePt, item.nameEn, item.nameEs, item.typePt, item.typeEn, item.typeEs]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (search && !searchable.includes(search)) return false;
      if (filters.tier !== 'all' && item.itemTier !== filters.tier) return false;
      if (filters.type !== 'all' && item.itemType !== filters.type) return false;
      if (filters.kind !== 'all' && item.kind !== filters.kind) return false;
      if (filters.category !== 'all' && item.category !== filters.category) return false;
      if (filters.active === 'active' && !item.isActive) return false;
      if (filters.active === 'inactive' && item.isActive) return false;
      return true;
    });
  }, [catalog, filters]);
  const selectedItems = useMemo(() => catalog.filter((item) => selectedIds.includes(item.id)), [catalog, selectedIds]);

  function update<K extends keyof ItemForm>(key: K, value: ItemForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleSelected(itemId: string) {
    setSelectedIds((current) => (current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]));
  }

  function toggleAllFiltered() {
    const filteredIds = filteredCatalog.map((item) => item.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));

    setSelectedIds((current) => {
      if (allSelected) {
        return current.filter((id) => !filteredIds.includes(id));
      }

      return Array.from(new Set([...current, ...filteredIds]));
    });
  }

  function submitItem() {
    createItem.mutate(
      {
        ...form,
        category: tierCategory[form.itemTier],
        image1Url: form.image1Url || undefined,
        image2Url: form.image2Url || undefined,
      },
      {
        onSuccess: () => {
          setForm({
            kind: 'equipment',
            itemTier: 'T4',
            itemType: 'WEAPON',
            namePt: '',
            nameEn: '',
            nameEs: '',
            typePt: '',
            typeEn: '',
            typeEs: '',
            image1Url: '',
            image2Url: '',
          });
          notifyToast({ title: 'Item cadastrado.', tone: 'success' });
        },
      },
    );
  }

  function uploadCreateImage(slot: 'image1Url' | 'image2Url', file?: File) {
    if (!file) return;
    uploadImage.mutate(file, { onSuccess: (data) => update(slot, data.url) });
  }

  function startEdit(item: ItemCatalog) {
    setEditingItemId(item.id);
    setEditForms((current) => ({
      ...current,
      [item.id]: {
        kind: item.kind,
        category: item.category,
        itemTier: item.itemTier ?? 'T4',
        itemType: item.itemType ?? 'WEAPON',
        namePt: item.namePt,
        nameEn: item.nameEn,
        nameEs: item.nameEs ?? '',
        typePt: item.typePt,
        typeEn: item.typeEn,
        typeEs: item.typeEs ?? '',
        image1Url: item.image1Url ?? '',
        image2Url: item.image2Url ?? '',
        isActive: item.isActive,
      },
    }));
  }

  function updateEdit<K extends keyof Required<ItemForm>>(itemId: string, key: K, value: Required<ItemForm>[K]) {
    setEditForms((current) => {
      const itemForm = current[itemId];
      return itemForm ? { ...current, [itemId]: { ...itemForm, [key]: value } } : current;
    });
  }

  function uploadEditImage(itemId: string, slot: 'image1Url' | 'image2Url', file?: File) {
    if (!file) return;
    uploadImage.mutate(file, { onSuccess: (data) => updateEdit(itemId, slot, data.url) });
  }

  function saveEdit(itemId: string) {
    const itemForm = editForms[itemId];
    if (!itemForm) return;
    updateItem.mutate({ id: itemId, ...itemForm }, {
      onSuccess: () => {
        setEditingItemId('');
        notifyToast({ title: 'Item atualizado.', tone: 'success' });
      },
    });
  }

  async function applyBulkEdit() {
    const payload = {
      ...(bulkForm.itemTier !== 'keep' ? { itemTier: bulkForm.itemTier as ItemTier } : {}),
      ...(bulkForm.itemType !== 'keep' ? { itemType: bulkForm.itemType as ItemType } : {}),
      ...(bulkForm.category !== 'keep' ? { category: bulkForm.category } : {}),
      ...(bulkForm.isActive !== 'keep' ? { isActive: bulkForm.isActive === 'active' } : {}),
    };

    if (selectedItems.length === 0 || Object.keys(payload).length === 0) return;

    for (const item of selectedItems) {
      await updateItem.mutateAsync({ id: item.id, ...payload });
    }

    setSelectedIds([]);
    setBulkForm({ itemTier: 'keep', itemType: 'keep', category: 'keep', isActive: 'keep' });
    notifyToast({ title: 'Alteracao em massa aplicada.', tone: 'success' });
  }

  function launchAuctions(item: ItemCatalog) {
    const quantity = normalizeAuctionQuantity(auctionQuantities[item.id]);
    createAuctions.mutate(
      { itemId: item.id, quantity, createdById: '' },
      { onSuccess: () => notifyToast({ title: `Leilao aberto: ${formatItemTitle(item)}`, tone: 'success' }) },
    );
  }

  function formatItemTitle(item: ItemCatalog): string {
    return item.namePt.trim().toLowerCase() === item.nameEn.trim().toLowerCase() ? item.namePt : `${item.namePt} / ${item.nameEn}`;
  }

  function createInterestForItem(item: ItemCatalog) {
    if (!interestForm.closesAt) {
      notifyToast({ title: 'Informe quando a declaração de interesse fecha.', tone: 'error' });
      return;
    }

    createInterest.mutate(
      {
        itemCatalogId: item.id,
        mode: interestForm.mode,
        closesAt: new Date(interestForm.closesAt).toISOString(),
        title: formatItemTitle(item),
      },
      {
        onSuccess: () => notifyToast({ title: `Interesse criado: ${formatItemTitle(item)}`, tone: 'success' }),
      },
    );
  }

  async function launchBulkAuctions() {
    for (const item of selectedItems) {
      if (item.itemTier && item.itemType && item.isActive) {
        await createAuctions.mutateAsync({ itemId: item.id, quantity: normalizeAuctionQuantity(auctionQuantities[item.id]), createdById: '' });
      }
    }

    setSelectedIds([]);
    notifyToast({ title: 'Leilões abertos para os itens selecionados.', tone: 'success' });
  }

  async function createBulkInterests() {
    if (!interestForm.closesAt) {
      notifyToast({ title: 'Informe quando a declaração de interesse fecha.', tone: 'error' });
      return;
    }

    const activeItemIds = selectedItems.filter((row) => row.isActive).map((item) => item.id);

    if (activeItemIds.length === 0) {
      return;
    }

    await createBulkInterest.mutateAsync({
      itemCatalogIds: activeItemIds,
      mode: interestForm.mode,
      closesAt: new Date(interestForm.closesAt).toISOString(),
    });

    setSelectedIds([]);
    notifyToast({ title: 'Interesses criados para os itens selecionados.', tone: 'success' });
  }

  function normalizeAuctionQuantity(value: number | undefined): number {
    if (!Number.isFinite(value)) return 1;
    return Math.min(20, Math.max(1, Math.trunc(value ?? 1)));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Armory</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'itemCatalogTitle')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(locale, 'registerItem')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-4">
          <Input placeholder="Nome PT" value={form.namePt} onChange={(event) => update('namePt', event.target.value)} />
          <Input placeholder="Name EN" value={form.nameEn} onChange={(event) => update('nameEn', event.target.value)} />
          <Input placeholder="Nombre ES" value={form.nameEs} onChange={(event) => update('nameEs', event.target.value)} />
          <Select value={form.kind} onChange={(event) => update('kind', event.target.value)}>
            {kinds.map((kind) => <option key={kind}>{kind}</option>)}
          </Select>
          <Select value={form.itemTier} onChange={(event) => update('itemTier', event.target.value as ItemTier)}>
            {tiers.map((tier) => <option key={tier}>{tier}</option>)}
          </Select>
          <Input placeholder="Tipo PT" value={form.typePt} onChange={(event) => update('typePt', event.target.value)} />
          <Input placeholder="Type EN" value={form.typeEn} onChange={(event) => update('typeEn', event.target.value)} />
          <Input placeholder="Tipo ES" value={form.typeEs} onChange={(event) => update('typeEs', event.target.value)} />
          <Select value={form.itemType} onChange={(event) => update('itemType', event.target.value as ItemType)}>
            {itemTypes.map((type) => <option key={type}>{type}</option>)}
          </Select>
          <div className="space-y-2 rounded-md border bg-background/35 p-3">
            <p className="text-sm font-semibold">Imagem PT / print 1</p>
            <FileUploadButton label={t(locale, 'attachImage')} onFileSelect={(files) => uploadCreateImage('image1Url', files?.[0])} />
            {form.image1Url && <img src={displayImageUrl(form.image1Url)} alt="Preview 1" className="h-24 w-full rounded-md border object-cover" />}
          </div>
          <div className="space-y-2 rounded-md border bg-background/35 p-3 lg:col-span-2">
            <p className="text-sm font-semibold">Imagem EN / print 2</p>
            <FileUploadButton label={t(locale, 'attachImage')} onFileSelect={(files) => uploadCreateImage('image2Url', files?.[0])} />
            {form.image2Url && <img src={displayImageUrl(form.image2Url)} alt="Preview 2" className="h-24 w-full rounded-md border object-cover" />}
          </div>
          <Button className="lg:col-span-2" onClick={submitItem} disabled={createItem.isPending}>
            <PackagePlus className="h-4 w-4" /> Register catalog item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" /> Filtros e correção em massa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome ou tipo"
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
              />
            </div>
            <Select value={filters.tier} onChange={(event) => updateFilter('tier', event.target.value)}>
              <option value="all">Todos os tiers</option>
              {tiers.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
            </Select>
            <Select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}>
              <option value="all">Todos os tipos</option>
              {itemTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </Select>
            <Select value={filters.kind} onChange={(event) => updateFilter('kind', event.target.value)}>
              <option value="all">Todos os grupos</option>
              {kinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
            </Select>
            <Select value={filters.active} onChange={(event) => updateFilter('active', event.target.value)}>
              <option value="all">Ativos e inativos</option>
              <option value="active">Somente ativos</option>
              <option value="inactive">Somente inativos</option>
            </Select>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
            <Select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}>
              <option value="all">Todas as categorias</option>
              {dynamicCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </Select>
            <Select value={bulkForm.category} onChange={(event) => setBulkForm((current) => ({ ...current, category: event.target.value }))}>
              <option value="keep">Manter categoria</option>
              {dynamicCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </Select>
            <Select value={bulkForm.itemTier} onChange={(event) => setBulkForm((current) => ({ ...current, itemTier: event.target.value }))}>
              <option value="keep">Manter tier</option>
              {tiers.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
            </Select>
            <Select value={bulkForm.itemType} onChange={(event) => setBulkForm((current) => ({ ...current, itemType: event.target.value }))}>
              <option value="keep">Manter tipo</option>
              {itemTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </Select>
            <Select value={bulkForm.isActive} onChange={(event) => setBulkForm((current) => ({ ...current, isActive: event.target.value }))}>
              <option value="keep">Manter status</option>
              <option value="active">Ativar</option>
              <option value="inactive">Desativar</option>
            </Select>
            <Button onClick={applyBulkEdit} disabled={selectedItems.length === 0 || updateItem.isPending}>
              <Wand2 className="h-4 w-4" /> Aplicar em {selectedItems.length}
            </Button>
          </div>
          <div className="grid gap-3 rounded-md border bg-background/35 p-3 lg:grid-cols-[180px_160px_1fr_auto]">
            <Select value={operationMode} onChange={(event) => setOperationMode(event.target.value as 'auction' | 'interest')}>
              <option value="auction">Fluxo: Leilão</option>
              <option value="interest">Fluxo: Interesse</option>
            </Select>
            {operationMode === 'interest' ? (
              <>
                <Select value={interestForm.mode} onChange={(event) => setInterestForm((current) => ({ ...current, mode: event.target.value as 'PvE' | 'PvP' }))}>
                  <option value="PvE">PvE</option>
                  <option value="PvP">PvP</option>
                </Select>
                <Input
                  type="datetime-local"
                  value={interestForm.closesAt}
                  onChange={(event) => setInterestForm((current) => ({ ...current, closesAt: event.target.value }))}
                />
                <Button onClick={createBulkInterests} disabled={selectedItems.length === 0 || createBulkInterest.isPending}>
                  <HandHeart className="h-4 w-4" /> {t(locale, 'openInterestIn')} {selectedItems.length}
                </Button>
              </>
            ) : (
              <>
                <div className="text-sm text-muted-foreground lg:col-span-2">
                  Usa a quantidade definida em cada card. O botão só abre para itens ativos com tier/tipo configurados.
                </div>
                <Button onClick={launchBulkAuctions} disabled={selectedItems.length === 0 || createAuctions.isPending}>
                  <Gavel className="h-4 w-4" /> {t(locale, 'openAuctionIn')} {selectedItems.length}
                </Button>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{filteredCatalog.length} itens na lista · {selectedItems.length} selecionados</span>
            <Button variant="secondary" onClick={toggleAllFiltered}>
              {filteredCatalog.every((item) => selectedIds.includes(item.id)) && filteredCatalog.length > 0 ? 'Limpar seleção filtrada' : 'Selecionar filtrados'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {filteredCatalog.map((item) => {
          const editForm = editForms[item.id];
          const isEditing = editingItemId === item.id && editForm;

          return (
            <Card key={item.id}>
              <CardContent className="grid gap-4 p-4 sm:grid-cols-[112px_1fr]">
                <div className="flex h-28 items-center justify-center overflow-hidden rounded-md border bg-background/50">
                  {item.image1Url ? (
                    <img src={displayImageUrl(item.image1Url)} alt={item.nameEn} className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 space-y-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid gap-2 md:grid-cols-2">
                        <Input value={editForm.namePt} onChange={(event) => updateEdit(item.id, 'namePt', event.target.value)} />
                        <Input value={editForm.nameEn} onChange={(event) => updateEdit(item.id, 'nameEn', event.target.value)} />
                        <Input value={editForm.nameEs} onChange={(event) => updateEdit(item.id, 'nameEs', event.target.value)} />
                        <Select value={editForm.kind} onChange={(event) => updateEdit(item.id, 'kind', event.target.value)}>
                          {kinds.map((kind) => <option key={kind}>{kind}</option>)}
                        </Select>
                        <Select value={editForm.category} onChange={(event) => updateEdit(item.id, 'category', event.target.value)}>
                          {categories.map((category) => <option key={category}>{category}</option>)}
                        </Select>
                        <Select value={editForm.itemTier} onChange={(event) => updateEdit(item.id, 'itemTier', event.target.value as ItemTier)}>
                          {tiers.map((tier) => <option key={tier}>{tier}</option>)}
                        </Select>
                        <Select value={editForm.itemType} onChange={(event) => updateEdit(item.id, 'itemType', event.target.value as ItemType)}>
                          {itemTypes.map((type) => <option key={type}>{type}</option>)}
                        </Select>
                        <Input value={editForm.typePt} onChange={(event) => updateEdit(item.id, 'typePt', event.target.value)} />
                        <Input value={editForm.typeEn} onChange={(event) => updateEdit(item.id, 'typeEn', event.target.value)} />
                        <Input value={editForm.typeEs} onChange={(event) => updateEdit(item.id, 'typeEs', event.target.value)} />
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <FileUploadButton label={t(locale, 'attachImage')} onFileSelect={(files) => uploadEditImage(item.id, 'image1Url', files?.[0])} />
                        <FileUploadButton label={t(locale, 'attachImage')} onFileSelect={(files) => uploadEditImage(item.id, 'image2Url', files?.[0])} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => saveEdit(item.id)} disabled={updateItem.isPending}>
                          <Check className="h-4 w-4" /> {t(locale, 'save')}
                        </Button>
                        <Button variant="secondary" onClick={() => setEditingItemId('')}>
                          <X className="h-4 w-4" /> {t(locale, 'cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelected(item.id)}
                            className="h-4 w-4 accent-primary"
                            aria-label={`Selecionar ${item.namePt}`}
                          />
                          <h2 className="truncate font-semibold">{itemName(item, locale)}</h2>
                          {item.itemTier && <Badge>{item.itemTier}</Badge>}
                          {item.itemType && <Badge tone="blue">{item.itemType}</Badge>}
                          {!item.isActive && <Badge tone="red">inactive</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.nameEn}</p>
                        <p className="text-xs text-muted-foreground">{item.kind} - {item.category} - {itemTypeName(item, locale)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {operationMode === 'auction' ? (
                          <>
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              value={auctionQuantities[item.id] ?? 1}
                              onChange={(event) => {
                                const value = event.target.value;
                                setAuctionQuantities((current) => ({ ...current, [item.id]: value === '' ? 1 : normalizeAuctionQuantity(Number(value)) }));
                              }}
                              className="w-24"
                            />
                            <Button onClick={() => launchAuctions(item)} disabled={createAuctions.isPending || !item.itemTier || !item.itemType || !item.isActive}>
                              <Gavel className="h-4 w-4" /> {t(locale, 'openAuctions')}
                            </Button>
                          </>
                        ) : (
                          <Button onClick={() => createInterestForItem(item)} disabled={createInterest.isPending || !item.isActive}>
                            <HandHeart className="h-4 w-4" /> {t(locale, 'publishInterest')}
                          </Button>
                        )}
                        <Button variant="secondary" onClick={() => startEdit(item)}>
                          <Pencil className="h-4 w-4" /> {t(locale, 'edit')}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!items.isLoading && filteredCatalog.length === 0 && (
        <EmptyState title="No catalog items yet">Register the first item before opening auctions.</EmptyState>
      )}
    </div>
  );
}
