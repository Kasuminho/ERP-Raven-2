import { Filter, Gavel, HandHeart, Search, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';
import type { Locale } from '@/store/locale-store';
import type { ItemTier, ItemType } from '@/types/api';
import {
  itemTypes,
  kinds,
  tiers,
  type BulkEditForm,
  type InterestOperationForm,
  type ItemFilters,
} from './admin-items-types';

type ItemCatalogControlsCardProps = {
  locale: Locale;
  filters: ItemFilters;
  bulkForm: BulkEditForm;
  dynamicCategories: string[];
  filteredCount: number;
  selectedCount: number;
  allFilteredSelected: boolean;
  operationMode: 'auction' | 'interest';
  interestForm: InterestOperationForm;
  isBulkUpdating: boolean;
  isCreatingAuctions: boolean;
  isCreatingBulkInterest: boolean;
  onUpdateFilter: (key: keyof ItemFilters, value: string) => void;
  onUpdateBulkForm: (patch: Partial<BulkEditForm>) => void;
  onSetOperationMode: (mode: 'auction' | 'interest') => void;
  onUpdateInterestForm: (patch: Partial<InterestOperationForm>) => void;
  onApplyBulkEdit: () => void;
  onCreateBulkInterests: () => void;
  onLaunchBulkAuctions: () => void;
  onToggleAllFiltered: () => void;
};

export function ItemCatalogControlsCard({
  locale,
  filters,
  bulkForm,
  dynamicCategories,
  filteredCount,
  selectedCount,
  allFilteredSelected,
  operationMode,
  interestForm,
  isBulkUpdating,
  isCreatingAuctions,
  isCreatingBulkInterest,
  onUpdateFilter,
  onUpdateBulkForm,
  onSetOperationMode,
  onUpdateInterestForm,
  onApplyBulkEdit,
  onCreateBulkInterests,
  onLaunchBulkAuctions,
  onToggleAllFiltered,
}: ItemCatalogControlsCardProps) {
  return (
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
              onChange={(event) => onUpdateFilter('search', event.target.value)}
            />
          </div>
          <Select value={filters.tier} onChange={(event) => onUpdateFilter('tier', event.target.value)}>
            <option value="all">Todos os tiers</option>
            {tiers.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
          </Select>
          <Select value={filters.type} onChange={(event) => onUpdateFilter('type', event.target.value)}>
            <option value="all">Todos os tipos</option>
            {itemTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
          <Select value={filters.kind} onChange={(event) => onUpdateFilter('kind', event.target.value)}>
            <option value="all">Todos os grupos</option>
            {kinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
          </Select>
          <Select value={filters.active} onChange={(event) => onUpdateFilter('active', event.target.value)}>
            <option value="all">Ativos e inativos</option>
            <option value="active">Somente ativos</option>
            <option value="inactive">Somente inativos</option>
          </Select>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
          <Select value={filters.category} onChange={(event) => onUpdateFilter('category', event.target.value)}>
            <option value="all">Todas as categorias</option>
            {dynamicCategories.map((category) => <option key={category} value={category}>{category}</option>)}
          </Select>
          <Select value={bulkForm.category} onChange={(event) => onUpdateBulkForm({ category: event.target.value })}>
            <option value="keep">Manter categoria</option>
            {dynamicCategories.map((category) => <option key={category} value={category}>{category}</option>)}
          </Select>
          <Select value={bulkForm.itemTier} onChange={(event) => onUpdateBulkForm({ itemTier: event.target.value as ItemTier | 'keep' })}>
            <option value="keep">Manter tier</option>
            {tiers.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
          </Select>
          <Select value={bulkForm.itemType} onChange={(event) => onUpdateBulkForm({ itemType: event.target.value as ItemType | 'keep' })}>
            <option value="keep">Manter tipo</option>
            {itemTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
          <Select value={bulkForm.isActive} onChange={(event) => onUpdateBulkForm({ isActive: event.target.value })}>
            <option value="keep">Manter status</option>
            <option value="active">Ativar</option>
            <option value="inactive">Desativar</option>
          </Select>
          <Button onClick={onApplyBulkEdit} disabled={selectedCount === 0 || isBulkUpdating}>
            <Wand2 className="h-4 w-4" /> Aplicar em {selectedCount}
          </Button>
        </div>
        <div className="grid gap-3 rounded-md border bg-background/35 p-3 lg:grid-cols-[180px_160px_1fr_auto]">
          <Select value={operationMode} onChange={(event) => onSetOperationMode(event.target.value as 'auction' | 'interest')}>
            <option value="auction">Fluxo: Leilão</option>
            <option value="interest">Fluxo: Interesse</option>
          </Select>
          {operationMode === 'interest' ? (
            <>
              <Select value={interestForm.mode} onChange={(event) => onUpdateInterestForm({ mode: event.target.value as 'PvE' | 'PvP' })}>
                <option value="PvE">PvE</option>
                <option value="PvP">PvP</option>
              </Select>
              <Input
                type="datetime-local"
                value={interestForm.closesAt}
                onChange={(event) => onUpdateInterestForm({ closesAt: event.target.value })}
              />
              <Button onClick={onCreateBulkInterests} disabled={selectedCount === 0 || isCreatingBulkInterest}>
                <HandHeart className="h-4 w-4" /> {t(locale, 'openInterestIn')} {selectedCount}
              </Button>
            </>
          ) : (
            <>
              <div className="text-sm text-muted-foreground lg:col-span-2">
                Usa a quantidade definida em cada card. O botão só abre para itens ativos com tier/tipo configurados.
              </div>
              <Button onClick={onLaunchBulkAuctions} disabled={selectedCount === 0 || isCreatingAuctions}>
                <Gavel className="h-4 w-4" /> {t(locale, 'openAuctionIn')} {selectedCount}
              </Button>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>{filteredCount} itens na lista · {selectedCount} selecionados</span>
          <Button variant="secondary" onClick={onToggleAllFiltered}>
            {allFilteredSelected ? 'Limpar seleção filtrada' : 'Selecionar filtrados'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
