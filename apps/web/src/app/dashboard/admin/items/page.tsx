'use client';

import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { notifyToast } from '@/components/ui/toaster';
import { useCreateBulkItemInterests, useCreateItem, useCreateItemAuctions, useCreateItemInterest, useItems, useUpdateItem } from '@/hooks/use-items-api';
import { useUploadImage } from '@/hooks/use-profile-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { ItemCatalog, ItemTier, ItemType, PlayerClass } from '@/types/api';
import { categories, tierCategory, type BulkEditForm, type InterestOperationForm, type ItemFilters, type ItemForm } from './_components/admin-items-types';
import { ItemCatalogCard } from './_components/item-catalog-card';
import { ItemCatalogControlsCard } from './_components/item-catalog-controls-card';
import { ItemCreateFormCard } from './_components/item-create-form-card';

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
    preferredClasses: [],
    image1Url: '',
    image2Url: '',
  });
  const [auctionQuantities, setAuctionQuantities] = useState<Record<string, number>>({});
  const [editingItemId, setEditingItemId] = useState('');
  const [editForms, setEditForms] = useState<Record<string, Required<ItemForm>>>({});
  const [filters, setFilters] = useState<ItemFilters>({
    search: '',
    tier: 'all',
    type: 'all',
    kind: 'all',
    category: 'all',
    active: 'all',
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkForm, setBulkForm] = useState<BulkEditForm>({
    itemTier: 'keep',
    itemType: 'keep',
    category: 'keep',
    isActive: 'keep',
  });
  const [operationMode, setOperationMode] = useState<'auction' | 'interest'>('auction');
  const [interestForm, setInterestForm] = useState<InterestOperationForm>({
    mode: 'PvE',
    closesAt: '',
  });
  const catalog = useMemo(() => items.data ?? [], [items.data]);
  const dynamicCategories = useMemo(
    () => Array.from(new Set([...categories, ...catalog.map((item) => item.category).filter((category): category is string => Boolean(category))])).sort(),
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

  function updateFilter(key: keyof ItemFilters, value: string) {
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
            preferredClasses: [],
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
        preferredClasses: item.preferredClasses ?? [],
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

  function togglePreferredClass(target: 'create' | string, playerClass: PlayerClass) {
    const toggle = (values: PlayerClass[]) => (
      values.includes(playerClass)
        ? values.filter((value) => value !== playerClass)
        : [...values, playerClass]
    );

    if (target === 'create') {
      setForm((current) => ({ ...current, preferredClasses: toggle(current.preferredClasses) }));
      return;
    }

    setEditForms((current) => {
      const itemForm = current[target];
      return itemForm ? { ...current, [target]: { ...itemForm, preferredClasses: toggle(itemForm.preferredClasses) } } : current;
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

      <ItemCreateFormCard
        locale={locale}
        form={form}
        isPending={createItem.isPending}
        onSubmit={submitItem}
        onUpdate={update}
        onTogglePreferredClass={togglePreferredClass}
        onUploadImage={uploadCreateImage}
      />

      <ItemCatalogControlsCard
        locale={locale}
        filters={filters}
        bulkForm={bulkForm}
        dynamicCategories={dynamicCategories}
        filteredCount={filteredCatalog.length}
        selectedCount={selectedItems.length}
        allFilteredSelected={filteredCatalog.length > 0 && filteredCatalog.every((item) => selectedIds.includes(item.id))}
        operationMode={operationMode}
        interestForm={interestForm}
        isBulkUpdating={updateItem.isPending}
        isCreatingAuctions={createAuctions.isPending}
        isCreatingBulkInterest={createBulkInterest.isPending}
        onUpdateFilter={updateFilter}
        onUpdateBulkForm={(patch) => setBulkForm((current) => ({ ...current, ...patch }))}
        onSetOperationMode={setOperationMode}
        onUpdateInterestForm={(patch) => setInterestForm((current) => ({ ...current, ...patch }))}
        onApplyBulkEdit={applyBulkEdit}
        onCreateBulkInterests={createBulkInterests}
        onLaunchBulkAuctions={launchBulkAuctions}
        onToggleAllFiltered={toggleAllFiltered}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {filteredCatalog.map((item) => (
          <ItemCatalogCard
            key={item.id}
            locale={locale}
            item={item}
            editForm={editForms[item.id]}
            isEditing={editingItemId === item.id && Boolean(editForms[item.id])}
            isSelected={selectedIds.includes(item.id)}
            operationMode={operationMode}
            auctionQuantity={auctionQuantities[item.id] ?? 1}
            isUpdating={updateItem.isPending}
            isCreatingAuctions={createAuctions.isPending}
            isCreatingInterest={createInterest.isPending}
            onToggleSelected={toggleSelected}
            onStartEdit={startEdit}
            onCancelEdit={() => setEditingItemId('')}
            onSaveEdit={saveEdit}
            onUpdateEdit={updateEdit}
            onTogglePreferredClass={togglePreferredClass}
            onUploadEditImage={uploadEditImage}
            onAuctionQuantityChange={(itemId, quantity) => {
              setAuctionQuantities((current) => ({ ...current, [itemId]: normalizeAuctionQuantity(quantity) }));
            }}
            onLaunchAuctions={launchAuctions}
            onCreateInterest={createInterestForItem}
          />
        ))}
      </div>

      {!items.isLoading && filteredCatalog.length === 0 && (
        <EmptyState title="No catalog items yet">Register the first item before opening auctions.</EmptyState>
      )}
    </div>
  );
}
