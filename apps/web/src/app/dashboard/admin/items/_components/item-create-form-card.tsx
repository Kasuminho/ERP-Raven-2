import { PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { displayImageUrl } from '@/lib/images';
import { t } from '@/lib/i18n';
import type { Locale } from '@/store/locale-store';
import { playerClassLabel } from '@/lib/game-labels';
import type { ItemTier, ItemType, PlayerClass } from '@/types/api';
import { itemTypes, kinds, playerClasses, tiers, type ItemForm } from './admin-items-types';

type ItemCreateFormCardProps = {
  locale: Locale;
  form: ItemForm;
  isPending: boolean;
  onSubmit: () => void;
  onUpdate: <K extends keyof ItemForm>(key: K, value: ItemForm[K]) => void;
  onTogglePreferredClass: (target: 'create', playerClass: PlayerClass) => void;
  onUploadImage: (slot: 'image1Url' | 'image2Url', file?: File) => void;
};

export function ItemCreateFormCard({
  locale,
  form,
  isPending,
  onSubmit,
  onUpdate,
  onTogglePreferredClass,
  onUploadImage,
}: ItemCreateFormCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(locale, 'registerItem')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-4">
        <Input placeholder="Nome PT" value={form.namePt} onChange={(event) => onUpdate('namePt', event.target.value)} />
        <Input placeholder="Name EN" value={form.nameEn} onChange={(event) => onUpdate('nameEn', event.target.value)} />
        <Input placeholder="Nombre ES" value={form.nameEs} onChange={(event) => onUpdate('nameEs', event.target.value)} />
        <Select value={form.kind} onChange={(event) => onUpdate('kind', event.target.value)}>
          {kinds.map((kind) => <option key={kind}>{kind}</option>)}
        </Select>
        <Select value={form.itemTier} onChange={(event) => onUpdate('itemTier', event.target.value as ItemTier)}>
          {tiers.map((tier) => <option key={tier}>{tier}</option>)}
        </Select>
        <Input placeholder="Tipo PT" value={form.typePt} onChange={(event) => onUpdate('typePt', event.target.value)} />
        <Input placeholder="Type EN" value={form.typeEn} onChange={(event) => onUpdate('typeEn', event.target.value)} />
        <Input placeholder="Tipo ES" value={form.typeEs} onChange={(event) => onUpdate('typeEs', event.target.value)} />
        <Select value={form.itemType} onChange={(event) => onUpdate('itemType', event.target.value as ItemType)}>
          {itemTypes.map((type) => <option key={type}>{type}</option>)}
        </Select>
        <div className="space-y-2 rounded-md border bg-background/35 p-3 lg:col-span-4">
          <p className="text-sm font-semibold">Classes preferenciais para arma</p>
          <div className="flex flex-wrap gap-2">
            {playerClasses.map((playerClass) => (
              <button
                key={playerClass}
                type="button"
                onClick={() => onTogglePreferredClass('create', playerClass)}
                className={`rounded-md border px-3 py-2 text-sm transition ${
                  form.preferredClasses.includes(playerClass)
                    ? 'border-primary bg-primary/20 text-primary'
                    : 'border-border bg-background/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                {playerClassLabel(playerClass, locale)}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2 rounded-md border bg-background/35 p-3">
          <p className="text-sm font-semibold">Imagem PT / print 1</p>
          <FileUploadButton label={t(locale, 'attachImage')} onFileSelect={(files) => onUploadImage('image1Url', files?.[0])} />
          {form.image1Url && <img src={displayImageUrl(form.image1Url)} alt="Preview 1" className="h-24 w-full rounded-md border object-cover" />}
        </div>
        <div className="space-y-2 rounded-md border bg-background/35 p-3 lg:col-span-2">
          <p className="text-sm font-semibold">Imagem EN / print 2</p>
          <FileUploadButton label={t(locale, 'attachImage')} onFileSelect={(files) => onUploadImage('image2Url', files?.[0])} />
          {form.image2Url && <img src={displayImageUrl(form.image2Url)} alt="Preview 2" className="h-24 w-full rounded-md border object-cover" />}
        </div>
        <Button className="lg:col-span-2" onClick={onSubmit} disabled={isPending}>
          <PackagePlus className="h-4 w-4" /> Register catalog item
        </Button>
      </CardContent>
    </Card>
  );
}
