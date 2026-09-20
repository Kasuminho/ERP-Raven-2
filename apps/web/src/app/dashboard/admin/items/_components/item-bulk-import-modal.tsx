'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Clipboard,
  FileText,
  Layers,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { notifyToast } from '@/components/ui/toaster';
import { useCreateBulkItems, useScanCatalogOcr, useValidateItemsBatch } from '@/hooks/use-items-api';
import { useScanStorageOcr } from '@/hooks/use-storage-api';
import type { ItemTier, ItemType } from '@/types/api';

type BulkDraftItem = {
  tempId: string;
  namePt: string;
  nameEn: string;
  category: string;
  itemType: ItemType | '';
  itemTier: ItemTier | '';
  kind: string;
  selected: boolean;
};

interface ItemBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'common', label: 'Branco (Comum - Servidor Zero)', color: 'text-zinc-200 border-zinc-500' },
  { value: 'uncommon', label: 'Verde (Incomum)', color: 'text-emerald-400 border-emerald-500' },
  { value: 'rare', label: 'Azul (Raro / T2-T3)', color: 'text-blue-400 border-blue-500' },
  { value: 'heroic', label: 'Vermelho (Heroico / T4)', color: 'text-rose-400 border-rose-500' },
  { value: 'legendary', label: 'Dourado (Lendário)', color: 'text-amber-400 border-amber-500' },
  { value: 'material', label: 'Material de Craft / Consumível', color: 'text-amber-200 border-amber-600' },
];

const ITEM_TYPES: Array<{ value: ItemType | ''; label: string }> = [
  { value: 'WEAPON', label: 'Arma' },
  { value: 'ARMOR', label: 'Armadura' },
  { value: 'ACCESSORY', label: 'Acessório' },
  { value: 'CELESTIAL_STONE', label: 'Pedra Celestial' },
  { value: '', label: 'Nenhum / Material Geral' },
];

export function ItemBulkImportModal({ isOpen, onClose, onSuccess }: ItemBulkImportModalProps) {
  const [activeTab, setActiveTab] = useState<'screenshot' | 'text'>('screenshot');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [itemsList, setItemsList] = useState<BulkDraftItem[]>([]);
  const [globalCategory, setGlobalCategory] = useState<string>('common');
  const [globalType, setGlobalType] = useState<ItemType | ''>('WEAPON');

  const validateBatch = useValidateItemsBatch();
  const createBulk = useCreateBulkItems();
  const scanCatalogOcr = useScanCatalogOcr();

  const [existingDbNames, setExistingDbNames] = useState<Set<string>>(new Set());

  // Listen for Ctrl+V (clipboard paste) of images anywhere while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i += 1) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length > 0) {
        handleImageFiles(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleImageFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    if (fileArray.length === 1) {
      setImagePreview(URL.createObjectURL(fileArray[0]));
    } else {
      setImagePreview(null);
    }

    setIsOcrProcessing(true);
    setOcrStatusText(`Lendo ${fileArray.length} print(s) com a visão multimodal do Gemini...`);

    try {
      const readAsBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ data: reader.result as string, mimeType: file.type || 'image/png' });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const base64Images = await Promise.all(fileArray.map((f) => readAsBase64(f)));
      const response = await scanCatalogOcr.mutateAsync({ images: base64Images });

      if (!response.scannedItems || response.scannedItems.length === 0) {
        notifyToast({
          title: 'Nenhum item detectado no(s) print(s)',
          description: 'Tente outro print mais nítido ou use a aba de texto.',
          tone: 'info',
        });
        return;
      }

      const duplicateCount = response.scannedItems.filter((i) => i.alreadyExists).length;
      const newItemsCount = response.scannedItems.length - duplicateCount;

      notifyToast({
        title: `${response.scannedItems.length} itens detectados em ${fileArray.length} print(s)!`,
        description: `${newItemsCount} novos encontrados e ${duplicateCount} já existentes identificados.`,
        tone: 'success',
      });

      const newDraftItems: BulkDraftItem[] = response.scannedItems.map((item, index) => {
        return {
          tempId: `draft-${Date.now()}-${index}`,
          namePt: item.itemName,
          nameEn: item.itemName,
          category: item.category || globalCategory,
          itemType: (item.itemType as ItemType) || globalType,
          itemTier: '',
          kind: item.kind || (item.category === 'material' ? 'material' : 'equipment'),
          selected: !item.alreadyExists,
        };
      });

      setItemsList((prev) => [...prev, ...newDraftItems]);
    } catch (err: any) {
      console.error('Erro OCR Gemini:', err);
      notifyToast({
        title: 'Erro no reconhecimento OCR via Gemini',
        description: err?.response?.data?.message || err.message || 'Verifique se a API Key do Gemini está configurada.',
        tone: 'error',
      });
    } finally {
      setIsOcrProcessing(false);
      setOcrStatusText('');
    }
  };

  const cleanOcrLine = (line: string): string => {
    return line
      .replace(/^[+x•\-\*#\d\s\.]+\s*/, '')
      .replace(/\s*(\+?\d+|Lv\.\s*\d+|x\d+|\d+x|\d+ea)$/i, '')
      .replace(/[\[\]{}()]/g, '')
      .trim();
  };

  const isNoiseLine = (line: string): boolean => {
    const lower = line.toLowerCase();
    const noiseWords = [
      'inventario',
      'inventário',
      'peso',
      'ouro',
      'diamante',
      'moeda',
      'organizar',
      'capacidade',
      'menu',
      'voltar',
      'cancelar',
      'confirmar',
      'item',
      'itens',
      'craft',
      'equipamento',
      'armazem',
      'armazém',
      'raven',
      'netmarble',
    ];
    return noiseWords.includes(lower) || lower.length < 3;
  };

  const handleParseText = () => {
    const lines = rawText
      .split('\n')
      .map((line) => cleanOcrLine(line))
      .filter((line) => line.length >= 2);

    if (lines.length === 0) {
      notifyToast({ title: 'Cole ao menos um nome de item.', tone: 'info' });
      return;
    }

    parseAndPopulateItems(lines);
  };

  const parseAndPopulateItems = async (names: string[]) => {
    // Deduplicate incoming batch names
    const uniqueIncoming = Array.from(new Set(names));

    // Pre-check against backend
    let dbFound = new Set<string>();
    try {
      const result = await validateBatch.mutateAsync({ names: uniqueIncoming });
      dbFound = new Set(result.existingNames.map((n) => n.toLowerCase()));
      setExistingDbNames(dbFound);
    } catch (err) {
      console.error('Falha ao checar duplicatas:', err);
    }

    const newDraftItems: BulkDraftItem[] = uniqueIncoming.map((name, index) => {
      const isDuplicate = dbFound.has(name.toLowerCase());
      return {
        tempId: `draft-${Date.now()}-${index}`,
        namePt: name,
        nameEn: name,
        category: globalCategory,
        itemType: globalType,
        itemTier: '',
        kind: globalCategory === 'material' ? 'material' : 'equipment',
        selected: !isDuplicate, // uncheck if already in database
      };
    });

    setItemsList(newDraftItems);
  };

  const updateDraftItem = (tempId: string, patch: Partial<BulkDraftItem>) => {
    setItemsList((prev) => prev.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item)));
  };

  const removeDraftItem = (tempId: string) => {
    setItemsList((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const addEmptyRow = () => {
    setItemsList((prev) => [
      ...prev,
      {
        tempId: `draft-manual-${Date.now()}`,
        namePt: '',
        nameEn: '',
        category: globalCategory,
        itemType: globalType,
        itemTier: '',
        kind: globalCategory === 'material' ? 'material' : 'equipment',
        selected: true,
      },
    ]);
  };

  const applyGlobalCategoryAndType = () => {
    setItemsList((prev) =>
      prev.map((item) => ({
        ...item,
        category: globalCategory,
        itemType: globalType,
        kind: globalCategory === 'material' ? 'material' : 'equipment',
      })),
    );
    notifyToast({
      title: 'Categoria e tipo aplicados a todos os itens da lista.',
      tone: 'info',
    });
  };

  const handleCommitImport = async () => {
    const toImport = itemsList.filter((item) => item.selected && item.namePt.trim().length > 0);

    if (toImport.length === 0) {
      notifyToast({
        title: 'Nenhum item válido selecionado para importação.',
        tone: 'info',
      });
      return;
    }

    try {
      const payload = {
        items: toImport.map((item) => ({
          namePt: item.namePt.trim(),
          nameEn: item.nameEn.trim() || item.namePt.trim(),
          category: item.category,
          kind: item.kind,
          itemType: item.itemType ? (item.itemType as ItemType) : null,
          itemTier: item.itemTier ? (item.itemTier as ItemTier) : null,
          preferredClasses: [],
          diamondSaleEnabled: false,
        })),
      };

      const result = await createBulk.mutateAsync(payload);

      notifyToast({
        title: `Sucesso! ${result.createdCount} itens cadastrados no catálogo.`,
        description: result.skippedCount > 0 ? `${result.skippedCount} itens ignorados (já existiam).` : undefined,
        tone: 'success',
      });

      // Cleanup and close
      setItemsList([]);
      setImagePreview(null);
      setRawText('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      notifyToast({
        title: 'Erro ao cadastrar itens em lote',
        description: err?.response?.data?.message || err.message,
        tone: 'error',
      });
    }
  };

  const selectedCount = useMemo(() => itemsList.filter((i) => i.selected && i.namePt.trim()).length, [itemsList]);
  const duplicateCount = useMemo(
    () => itemsList.filter((i) => existingDbNames.has(i.namePt.trim().toLowerCase())).length,
    [itemsList, existingDbNames],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-white/10 bg-[#0f131c] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#161c2b] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-[var(--font-cinzel)] text-xl font-bold text-white flex items-center gap-2">
                Importação em Lote via Print / OCR
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/30">
                  Servidor Zero
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Tire print do inventário/craft no Raven 2 e dê <kbd className="rounded bg-black/40 px-1 py-0.5 border border-white/20 text-amber-400 font-mono">Ctrl+V</kbd> aqui, ou cole a lista em texto.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Top Control Bar: Mode Tabs & Global Defaults */}
        <div className="border-b border-white/10 bg-[#121622] px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('screenshot')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                activeTab === 'screenshot'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              <Upload className="h-4 w-4" />
              Upload ou Print (Ctrl+V)
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                activeTab === 'text'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              <FileText className="h-4 w-4" />
              Colar Lista em Texto
            </button>
          </div>

          {/* Quick Defaults Applier */}
          <div className="flex items-center gap-2 bg-[#182030] p-1.5 rounded-lg border border-white/10 text-xs">
            <span className="text-zinc-400 pl-1 font-medium">Grau Padrão:</span>
            <select
              value={globalCategory}
              onChange={(e) => setGlobalCategory(e.target.value)}
              className="rounded bg-[#0f131c] border border-white/10 px-2 py-1 text-xs text-white"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <span className="text-zinc-400 pl-1 font-medium">Tipo:</span>
            <select
              value={globalType}
              onChange={(e) => setGlobalType(e.target.value as ItemType | '')}
              className="rounded bg-[#0f131c] border border-white/10 px-2 py-1 text-xs text-white"
            >
              {ITEM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <button
              onClick={applyGlobalCategoryAndType}
              title="Aplica o grau e tipo selecionados a todos os itens carregados"
              className="rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 px-2.5 py-1 font-medium border border-amber-500/30 flex items-center gap-1 transition-colors"
            >
              <Layers className="h-3.5 w-3.5" />
              Aplicar a Todos
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Input Area Depending on Active Tab */}
          {activeTab === 'screenshot' && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Dropzone & Paste Box */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleImageFiles(e.dataTransfer.files);
                  }
                }}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-white/[0.02] p-8 text-center hover:border-amber-400/50 hover:bg-amber-500/[0.02] transition-colors relative cursor-pointer group"
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleImageFiles(e.target.files);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                  {isOcrProcessing ? <RefreshCw className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                </div>

                <h3 className="text-sm font-semibold text-white">Arraste um ou mais prints ou clique para selecionar</h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Envie vários prints de uma só vez ou dê <kbd className="rounded bg-black/60 px-1.5 py-0.5 border border-white/20 text-amber-400 font-mono">Ctrl+V</kbd> a qualquer momento
                </p>

                {isOcrProcessing && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs text-amber-300 animate-pulse">
                    <Sparkles className="h-4 w-4" />
                    {ocrStatusText}
                  </div>
                )}
              </div>

              {/* Preview Thumbnail */}
              <div className="flex flex-col rounded-xl border border-white/10 bg-[#141824] p-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Visualização do Print
                  </span>
                  {imagePreview && (
                    <button
                      onClick={() => setImagePreview(null)}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Remover print
                    </button>
                  )}
                </div>

                {imagePreview ? (
                  <div className="relative flex items-center justify-center max-h-[160px] overflow-hidden rounded-lg border border-white/10 bg-black/50">
                    <img src={imagePreview} alt="Print do Raven 2" className="object-contain max-h-[160px] w-full" />
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">
                    Nenhum print carregado ainda. Tire um print no jogo e aperte Ctrl+V.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="rounded-xl border border-white/10 bg-[#141824] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Cole os nomes dos itens (um por linha)
                </label>
                <span className="text-xs text-zinc-500">Ex: Espada de Ferro Velha</span>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Espada de Ferro Velha&#10;Lança de Prata&#10;Poção de Cura Comum&#10;Fragmento de Minério"
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-[#0c0f17] p-3 text-sm text-white font-mono placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
              />
              <button
                onClick={handleParseText}
                disabled={!rawText.trim() || validateBatch.isPending}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-black hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                Processar e Checar Duplicatas
              </button>
            </div>
          )}

          {/* Items Extraction Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  Itens Detectados ({itemsList.length})
                </h3>
                {duplicateCount > 0 && (
                  <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {duplicateCount} já cadastrado(s) no catálogo
                  </span>
                )}
              </div>

              <button
                onClick={addEmptyRow}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar Linha Manual
              </button>
            </div>

            {itemsList.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-[#121622] p-8 text-center text-zinc-500 text-sm">
                Envie um print ou cole o texto para que a lista de itens seja exibida aqui para conferência.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#121622]">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-[#171c2b] text-[11px] uppercase tracking-wider text-zinc-400 border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={itemsList.length > 0 && itemsList.every((i) => i.selected)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setItemsList((prev) => prev.map((item) => ({ ...item, selected: checked })));
                          }}
                          className="rounded border-white/20 bg-black/40 text-amber-500 focus:ring-0"
                        />
                      </th>
                      <th className="py-2.5 px-3">Status & Nome do Item</th>
                      <th className="py-2.5 px-3 w-48">Grau (Categoria)</th>
                      <th className="py-2.5 px-3 w-40">Tipo</th>
                      <th className="py-2.5 px-3 w-12 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {itemsList.map((item) => {
                      const isDuplicate = existingDbNames.has(item.namePt.trim().toLowerCase());

                      return (
                        <tr
                          key={item.tempId}
                          className={`transition-colors ${
                            isDuplicate ? 'bg-amber-500/[0.04]' : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={(e) => updateDraftItem(item.tempId, { selected: e.target.checked })}
                              className="rounded border-white/20 bg-black/40 text-amber-500 focus:ring-0"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={item.namePt}
                                  onChange={(e) =>
                                    updateDraftItem(item.tempId, {
                                      namePt: e.target.value,
                                      nameEn: item.nameEn === item.namePt ? e.target.value : item.nameEn,
                                    })
                                  }
                                  placeholder="Nome do item..."
                                  className="w-full rounded bg-[#0c0f17] border border-white/10 px-2 py-1 text-xs text-white font-sans focus:border-amber-400 focus:outline-none"
                                />
                                {isDuplicate ? (
                                  <span className="shrink-0 flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                                    <AlertTriangle className="h-3 w-3" />
                                    Já existe
                                  </span>
                                ) : (
                                  <span className="shrink-0 flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                                    <Sparkles className="h-3 w-3" />
                                    Novo
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={item.category}
                              onChange={(e) =>
                                updateDraftItem(item.tempId, {
                                  category: e.target.value,
                                  kind: e.target.value === 'material' ? 'material' : 'equipment',
                                })
                              }
                              className="w-full rounded bg-[#0c0f17] border border-white/10 px-2 py-1 text-xs text-white font-sans focus:border-amber-400 focus:outline-none"
                            >
                              {CATEGORY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={item.itemType}
                              onChange={(e) => updateDraftItem(item.tempId, { itemType: e.target.value as ItemType | '' })}
                              className="w-full rounded bg-[#0c0f17] border border-white/10 px-2 py-1 text-xs text-white font-sans focus:border-amber-400 focus:outline-none"
                            >
                              {ITEM_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => removeDraftItem(item.tempId)}
                              title="Remover linha"
                              className="rounded p-1 text-zinc-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between border-t border-white/10 bg-[#161c2b] px-6 py-4 gap-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>
              <strong className="text-white">{selectedCount}</strong> item(s) selecionado(s) para importação.
            </span>
            {duplicateCount > 0 && (
              <span className="text-amber-400">
                ({duplicateCount} ignorado(s) por duplicidade no banco)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCommitImport}
              disabled={selectedCount === 0 || createBulk.isPending}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:shadow-none"
            >
              {createBulk.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Cadastrando Itens...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Cadastrar {selectedCount} Itens no Catálogo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
