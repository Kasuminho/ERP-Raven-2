import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';
import type { Locale } from '@/store/locale-store';
import type { ItemType } from '@/types/api';

const itemTypes: ItemType[] = ['WEAPON', 'ARMOR', 'ACCESSORY', 'CELESTIAL_STONE'];

function itemTypeLabel(type: ItemType): string {
  return type.replace('_', ' ');
}

type StaffInterestFiltersProps = {
  locale: Locale;
  typeFilter: 'ALL' | ItemType;
  createdDateFilter: string;
  showResolved: boolean;
  onTypeFilterChange: (value: 'ALL' | ItemType) => void;
  onCreatedDateFilterChange: (value: string) => void;
  onShowResolvedChange: (value: boolean) => void;
  onClear: () => void;
};

export function StaffInterestFilters({
  locale,
  typeFilter,
  createdDateFilter,
  showResolved,
  onTypeFilterChange,
  onCreatedDateFilterChange,
  onShowResolvedChange,
  onClear,
}: StaffInterestFiltersProps) {
  return (
    <Card>
      <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
        <label className="space-y-1 text-sm">
          <span className="text-xs uppercase text-muted-foreground">{t(locale, 'filterByType')}</span>
          <Select value={typeFilter} onChange={(event) => onTypeFilterChange(event.target.value as 'ALL' | ItemType)}>
            <option value="ALL">{t(locale, 'allTypes')}</option>
            {itemTypes.map((type) => (
              <option key={type} value={type}>{itemTypeLabel(type)}</option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs uppercase text-muted-foreground">{t(locale, 'filterByAddedDate')}</span>
          <Input type="date" value={createdDateFilter} onChange={(event) => onCreatedDateFilterChange(event.target.value)} />
        </label>
        <label className="flex items-center gap-2 rounded-md border bg-background/45 px-3 py-2 text-sm text-muted-foreground">
          <input className="h-4 w-4 accent-primary" type="checkbox" checked={showResolved} onChange={(event) => onShowResolvedChange(event.target.checked)} />
          {t(locale, 'showResolvedInterests')}
        </label>
        <Button variant="secondary" onClick={onClear}>
          {t(locale, 'clearFilters')}
        </Button>
      </CardContent>
    </Card>
  );
}
