import { Check, Gavel, HandHeart, ImagePlus, Pencil, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { itemName, itemTypeName, playerClassLabel } from '@/lib/game-labels';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import type { Locale } from '@/store/locale-store';
import type { ItemCatalog, ItemTier, ItemType, PlayerClass } from '@/types/api';
import { categories, itemTypes, kinds, playerClasses, tiers, type ItemForm } from './admin-items-types';

type ItemCatalogCardProps = {
  locale: Locale;
  item: ItemCatalog;
  editForm?: Required<ItemForm>;
  isEditing: boolean;
  isSelected: boolean;
  operationMode: 'auction' | 'interest';
  auctionQuantity: number;
  isUpdating: boolean;
  isCreatingAuctions: boolean;
  isCreatingInterest: boolean;
  onToggleSelected: (itemId: string) => void;
  onStartEdit: (item: ItemCatalog) => void;
  onCancelEdit: () => void;
  onSaveEdit: (itemId: string) => void;
  onUpdateEdit: <K extends keyof Required<ItemForm>>(itemId: string, key: K, value: Required<ItemForm>[K]) => void;
  onTogglePreferredClass: (target: string, playerClass: PlayerClass) => void;
  onUploadEditImage: (itemId: string, slot: 'image1Url' | 'image2Url', file?: File) => void;
  onAuctionQuantityChange: (itemId: string, quantity: number) => void;
  onLaunchAuctions: (item: ItemCatalog) => void;
  onCreateInterest: (item: ItemCatalog) => void;
};

export function ItemCatalogCard({
  locale,
  item,
  editForm,
  isEditing,
  isSelected,
  operationMode,
  auctionQuantity,
  isUpdating,
  isCreatingAuctions,
  isCreatingInterest,
  onToggleSelected,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onUpdateEdit,
  onTogglePreferredClass,
  onUploadEditImage,
  onAuctionQuantityChange,
  onLaunchAuctions,
  onCreateInterest,
}: ItemCatalogCardProps) {
  return (
    <Card>
      <CardContent className="grid gap-4 p-4 sm:grid-cols-[112px_1fr]">
        <div className="flex h-28 items-center justify-center overflow-hidden rounded-md border bg-background/50">
          {item.image1Url ? (
            <img src={displayImageUrl(item.image1Url)} alt={item.nameEn} className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 space-y-3">
          {isEditing && editForm ? (
            <div className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                <Input value={editForm.namePt} onChange={(event) => onUpdateEdit(item.id, 'namePt', event.target.value)} />
                <Input value={editForm.nameEn} onChange={(event) => onUpdateEdit(item.id, 'nameEn', event.target.value)} />
                <Input value={editForm.nameEs} onChange={(event) => onUpdateEdit(item.id, 'nameEs', event.target.value)} />
                <Select value={editForm.kind} onChange={(event) => onUpdateEdit(item.id, 'kind', event.target.value)}>
                  {kinds.map((kind) => <option key={kind}>{kind}</option>)}
                </Select>
                <Select value={editForm.category} onChange={(event) => onUpdateEdit(item.id, 'category', event.target.value)}>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </Select>
                <Select value={editForm.itemTier} onChange={(event) => onUpdateEdit(item.id, 'itemTier', event.target.value as ItemTier)}>
                  {tiers.map((tier) => <option key={tier}>{tier}</option>)}
                </Select>
                <Select value={editForm.itemType} onChange={(event) => onUpdateEdit(item.id, 'itemType', event.target.value as ItemType)}>
                  {itemTypes.map((type) => <option key={type}>{type}</option>)}
                </Select>
                <Input value={editForm.typePt} onChange={(event) => onUpdateEdit(item.id, 'typePt', event.target.value)} />
                <Input value={editForm.typeEn} onChange={(event) => onUpdateEdit(item.id, 'typeEn', event.target.value)} />
                <Input value={editForm.typeEs} onChange={(event) => onUpdateEdit(item.id, 'typeEs', event.target.value)} />
              </div>
              <label className="flex items-center gap-3 rounded-md border bg-background/35 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.diamondSaleEnabled}
                  onChange={(event) => onUpdateEdit(item.id, 'diamondSaleEnabled', event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Habilitar venda por diamantes para terceiros
              </label>
              <div className="space-y-2 rounded-md border bg-background/35 p-3">
                <p className="text-sm font-semibold">Classes preferenciais para arma</p>
                <div className="flex flex-wrap gap-2">
                  {playerClasses.map((playerClass) => (
                    <button
                      key={playerClass}
                      type="button"
                      onClick={() => onTogglePreferredClass(item.id, playerClass)}
                      className={`rounded-md border px-3 py-2 text-sm transition ${
                        editForm.preferredClasses.includes(playerClass)
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-border bg-background/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {playerClassLabel(playerClass, locale)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <FileUploadButton label={t(locale, 'attachImage')} onFileSelect={(files) => onUploadEditImage(item.id, 'image1Url', files?.[0])} />
                <FileUploadButton label={t(locale, 'attachImage')} onFileSelect={(files) => onUploadEditImage(item.id, 'image2Url', files?.[0])} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => onSaveEdit(item.id)} disabled={isUpdating}>
                  <Check className="h-4 w-4" /> {t(locale, 'save')}
                </Button>
                <Button variant="secondary" onClick={onCancelEdit}>
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
                    checked={isSelected}
                    onChange={() => onToggleSelected(item.id)}
                    className="h-4 w-4 accent-primary"
                    aria-label={`Selecionar ${item.namePt}`}
                  />
                  <h2 className="truncate font-semibold">{itemName(item, locale)}</h2>
                  {item.itemTier && <Badge>{item.itemTier}</Badge>}
                  {item.itemType && <Badge tone="blue">{item.itemType}</Badge>}
                  {!item.isActive && <Badge tone="red">inactive</Badge>}
                  {item.diamondSaleEnabled && <Badge tone="gold">Venda por diamantes</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{item.nameEn}</p>
                <p className="text-xs text-muted-foreground">{item.kind} - {item.category} - {itemTypeName(item, locale)}</p>
                {item.preferredClasses?.length > 0 && (
                  <p className="mt-1 text-xs text-primary">
                    Bonus: {item.preferredClasses.map((playerClass) => playerClassLabel(playerClass, locale)).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {operationMode === 'auction' ? (
                  <>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={auctionQuantity}
                      onChange={(event) => {
                        const value = event.target.value;
                        onAuctionQuantityChange(item.id, value === '' ? 1 : Number(value));
                      }}
                      className="w-24"
                    />
                    <Button onClick={() => onLaunchAuctions(item)} disabled={isCreatingAuctions || !item.itemTier || !item.itemType || !item.isActive}>
                      <Gavel className="h-4 w-4" /> {t(locale, 'openAuctions')}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => onCreateInterest(item)} disabled={isCreatingInterest || !item.isActive}>
                    <HandHeart className="h-4 w-4" /> {t(locale, 'publishInterest')}
                  </Button>
                )}
                <Button variant="secondary" onClick={() => onStartEdit(item)}>
                  <Pencil className="h-4 w-4" /> {t(locale, 'edit')}
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
