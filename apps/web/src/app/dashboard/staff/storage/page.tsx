'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Package,
  Sparkles,
  Upload,
  Search,
  Filter,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Send,
  Trash2,
  Edit2,
  Key,
  X,
  Layers,
  Image as ImageIcon,
  Check,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import {
  useDispatchStorageItem,
  useImportStorageItems,
  useScanStorageOcr,
  useSetStorageConfig,
  useStorageConfig,
  useStorageItems,
  useDeleteStorageItem,
  useUpdateStorageItem,
  useStaffStorageRequests,
  useDispatchStorageRequestStaff,
  useRejectStorageRequestStaff,
} from '@/hooks/use-storage-api';
import type {
  GuildStorageRequest,
  ScannedStorageItemResult,
  StorageItemWithQueue,
  StorageQueueWaiter,
} from '@/types/api';

export default function GuildStoragePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedKind, setSelectedKind] = useState('ALL');

  // Modals state
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [dispatchItem, setDispatchItem] = useState<StorageItemWithQueue | null>(null);
  const [selectedWaiter, setSelectedWaiter] = useState<StorageQueueWaiter | null>(null);
  const [dispatchQty, setDispatchQty] = useState(1);
  const [dispatchReason, setDispatchReason] = useState('');
  const [editItem, setEditItem] = useState<StorageItemWithQueue | null>(null);
  const [editQty, setEditQty] = useState(1);
  const [editSource, setEditSource] = useState('');

  // API hooks
  const { data: storageData, isLoading, refetch } = useStorageItems({
    search: searchTerm || undefined,
    category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
    kind: selectedKind !== 'ALL' ? selectedKind : undefined,
  });

  const { data: configData } = useStorageConfig();
  const setConfigMutation = useSetStorageConfig();
  const importMutation = useImportStorageItems();
  const dispatchMutation = useDispatchStorageItem();
  const updateMutation = useUpdateStorageItem();
  const deleteMutation = useDeleteStorageItem();
  const scanMutation = useScanStorageOcr();

  const [activeMainTab, setActiveMainTab] = useState<'inventory' | 'requests'>('inventory');
  const staffRequestsQuery = useStaffStorageRequests();
  const dispatchStaffRequest = useDispatchStorageRequestStaff();
  const rejectStaffRequest = useRejectStorageRequestStaff();

  // OCR Upload State
  const [selectedImages, setSelectedImages] = useState<Array<{ name: string; data: string; mimeType: string }>>([]);
  const [scannedResults, setScannedResults] = useState<ScannedStorageItemResult[]>([]);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats
  const items = storageData?.items ?? [];
  const totalUnits = storageData?.totalUnits ?? 0;
  const totalUnique = storageData?.totalUniqueItems ?? 0;
  const totalAlerts = storageData?.totalQueueAlerts ?? 0;

  // Handle Clipboard Paste of Images
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (!scanModalOpen) return;
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            addImageFile(file);
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [scanModalOpen]);

  function addImageFile(file: File) {
    if (selectedImages.length >= 20) {
      notifyToast({ title: 'Limite de 20 imagens por lote atingido.', tone: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedImages((prev) => [
        ...prev,
        {
          name: file.name || `Print_${prev.length + 1}.png`,
          data: result,
          mimeType: file.type || 'image/png',
        },
      ]);
    };
    reader.readAsDataURL(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => addImageFile(file));
    e.target.value = '';
  }

  function removeImage(index: number) {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleScanSubmit() {
    if (selectedImages.length === 0) {
      notifyToast({ title: 'Selecione pelo menos um print para escanear.', tone: 'error' });
      return;
    }

    setScanProgress({ current: 0, total: selectedImages.length });
    const aggregatedMap = new Map<string, ScannedStorageItemResult>();

    try {
      // Processar 1 print por vez para evitar payloads gigantes (413 Payload Too Large) e dar feedback de progresso
      for (let i = 0; i < selectedImages.length; i++) {
        setScanProgress({ current: i + 1, total: selectedImages.length });
        const img = selectedImages[i];
        const response = await scanMutation.mutateAsync({
          images: [{ data: img.data, mimeType: img.mimeType }],
          apiKey: apiKeyInput.trim() || undefined,
        });

        const items = response.scannedItems || (response as any).items || [];
        for (const item of items) {
          const key = item.itemName.trim().toLowerCase();
          const existing = aggregatedMap.get(key);
          if (existing) {
            existing.quantity += item.quantity;
            if (!existing.acquisitionInfo && item.acquisitionInfo) {
              existing.acquisitionInfo = item.acquisitionInfo;
            }
            if (!existing.acquisitionDate && item.acquisitionDate) {
              existing.acquisitionDate = item.acquisitionDate;
            }
          } else {
            aggregatedMap.set(key, { ...item });
          }
        }
      }

      const items = Array.from(aggregatedMap.values());
      if (!items || items.length === 0) {
        notifyToast({
          title: 'Nenhum item detectado no(s) print(s)',
          description: 'Tente outro print mais nítido ou confira se a tela do jogo está visível.',
          tone: 'info',
        });
        return;
      }

      setScannedResults(items);
      notifyToast({
        title: `Leitura concluída com sucesso!`,
        description: `${items.length} tipos de itens identificados em ${selectedImages.length} print(s).`,
        tone: 'success',
      });
    } catch (err: any) {
      notifyToast({
        title: 'Falha no processamento OCR',
        description: err?.response?.data?.message || err.message || 'Erro ao conectar ao Gemini.',
        tone: 'error',
      });
    } finally {
      setScanProgress(null);
    }
  }

  async function handleConfirmImport() {
    if (scannedResults.length === 0) return;

    try {
      const result = await importMutation.mutateAsync({
        items: scannedResults.map((item) => ({
          itemName: item.itemName,
          quantity: item.quantity,
          category: item.category,
          itemType: item.itemType,
          kind: item.kind,
          source: item.acquisitionInfo || 'Importação OCR Gemini',
          acquisitionDate: item.acquisitionDate,
          acquisitionInfo: item.acquisitionInfo,
        })),
      });

      const skippedMsg = (result as any).skippedDuplicatesCount > 0
        ? `, ${(result as any).skippedDuplicatesCount} coletas repetidas ignoradas`
        : '';

      notifyToast({
        title: 'Estoque atualizado no Baú!',
        description: `${result.importedCount} itens processados (${result.createdCount} novos, ${result.updatedCount} acumulados${skippedMsg}).`,
        tone: 'success',
      });

      setScanModalOpen(false);
      setSelectedImages([]);
      setScannedResults([]);
    } catch (err: any) {
      notifyToast({
        title: 'Erro ao importar itens',
        description: err?.response?.data?.message || err.message,
        tone: 'error',
      });
    }
  }

  async function handleSaveConfig() {
    if (!apiKeyInput.trim()) {
      notifyToast({ title: 'Insira uma chave válida.', tone: 'error' });
      return;
    }
    try {
      await setConfigMutation.mutateAsync({ apiKey: apiKeyInput.trim() });
      notifyToast({ title: 'Chave do Gemini configurada com sucesso!', tone: 'success' });
      setConfigModalOpen(false);
      setApiKeyInput('');
    } catch (err: any) {
      notifyToast({
        title: 'Erro ao salvar configuração',
        description: err?.response?.data?.message || err.message,
        tone: 'error',
      });
    }
  }

  async function handleConfirmDispatch() {
    if (!dispatchItem || !selectedWaiter) return;

    try {
      const result = await dispatchMutation.mutateAsync({
        storageItemId: dispatchItem.id,
        requestId: selectedWaiter.requestId,
        quantity: dispatchQty,
        reason: dispatchReason.trim() || undefined,
      });

      notifyToast({
        title: 'Item distribuído com sucesso!',
        description: `${result.deliveredQuantity}x entregue para ${selectedWaiter.playerName}. Saldo restante no baú: ${result.remainingStock}.`,
        tone: 'success',
      });

      setDispatchItem(null);
      setSelectedWaiter(null);
      setDispatchQty(1);
      setDispatchReason('');
    } catch (err: any) {
      notifyToast({
        title: 'Falha no envio do item',
        description: err?.response?.data?.message || err.message,
        tone: 'error',
      });
    }
  }

  async function handleSaveEdit() {
    if (!editItem) return;
    try {
      await updateMutation.mutateAsync({
        id: editItem.id,
        data: {
          quantity: editQty,
          source: editSource.trim() || undefined,
        },
      });
      notifyToast({ title: 'Item atualizado com sucesso!', tone: 'success' });
      setEditItem(null);
    } catch (err: any) {
      notifyToast({
        title: 'Erro ao atualizar item',
        description: err?.response?.data?.message || err.message,
        tone: 'error',
      });
    }
  }

  async function handleDelete(item: StorageItemWithQueue) {
    if (!confirm(`Remover "${item.itemName}" permanentemente do baú?`)) return;
    try {
      await deleteMutation.mutateAsync(item.id);
      notifyToast({ title: 'Item removido do baú.', tone: 'info' });
    } catch (err: any) {
      notifyToast({
        title: 'Erro ao remover item',
        description: err?.response?.data?.message || err.message,
        tone: 'error',
      });
    }
  }

  async function handleDispatchStaffRequest(req: GuildStorageRequest) {
    if (!confirm(`Confirmar envio de ${req.quantity}x "${req.storageItem?.itemName}" para ${req.player?.nickname}? O estoque do baú será baixado e o aviso publicado no Discord.`)) return;
    try {
      await dispatchStaffRequest.mutateAsync({ requestId: req.id });
      notifyToast({
        title: 'Item despachado com sucesso!',
        description: `${req.quantity}x ${req.storageItem?.itemName} enviado para ${req.player?.nickname}. Vaga liberada para o jogador.`,
        tone: 'success',
      });
    } catch (err: any) {
      notifyToast({
        title: 'Falha ao despachar item',
        description: err?.response?.data?.message || err.message,
        tone: 'error',
      });
    }
  }

  async function handleRejectStaffRequest(req: GuildStorageRequest) {
    const reason = prompt(`Motivo da rejeição para ${req.player?.nickname} (opcional):`);
    if (reason === null) return;
    try {
      await rejectStaffRequest.mutateAsync({ requestId: req.id, staffNote: reason.trim() || undefined });
      notifyToast({
        title: 'Solicitação rejeitada',
        description: `A solicitação foi recusada e a vaga de ${req.player?.nickname} foi liberada.`,
        tone: 'info',
      });
    } catch (err: any) {
      notifyToast({
        title: 'Falha ao rejeitar solicitação',
        description: err?.response?.data?.message || err.message,
        tone: 'error',
      });
    }
  }

  function getRarityBadge(category: string) {
    const cat = category.toLowerCase();
    if (cat.includes('heroic') || cat.includes('heroico')) {
      return <Badge className="border-purple-500/50 bg-purple-950/60 text-purple-300">Heroico</Badge>;
    }
    if (cat.includes('rare') || cat.includes('raro')) {
      return <Badge className="border-blue-500/50 bg-blue-950/60 text-blue-300">Raro</Badge>;
    }
    if (cat.includes('uncommon') || cat.includes('incomum')) {
      return <Badge className="border-emerald-500/50 bg-emerald-950/60 text-emerald-300">Incomum</Badge>;
    }
    return <Badge className="border-white/20 bg-white/5 text-slate-300">Comum</Badge>;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-xl border border-primary/20 bg-card/60 p-5 shadow-rune backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Staff Exclusivo
              </span>
              <span className="text-xs text-muted-foreground">Raven Command Vault</span>
            </div>
            <h1 className="page-title mt-1 text-2xl sm:text-3xl">Baú da Guilda</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Estoque consolidado de drops, leitura automatizada de múltiplos prints via Google Gemini Multimodal Vision e atendimento de pedidos do Codex priorizado por assiduidade.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => setScanModalOpen(true)}
              className="gap-2 bg-gradient-to-r from-amber-600 to-amber-500 font-semibold text-black shadow-lg hover:from-amber-500 hover:to-amber-400"
            >
              <Sparkles className="h-4 w-4" />
              Escanear Prints (Gemini OCR)
            </Button>

            <Button
              variant="secondary"
              onClick={() => setConfigModalOpen(true)}
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
            >
              <Key className="h-4 w-4" />
              {configData?.hasConfiguredKey ? 'Chave Gemini (Ativa)' : 'Configurar Gemini'}
            </Button>

            <Button
              variant="ghost"
              onClick={() => refetch()}
              className="h-9 w-9 px-0 text-muted-foreground hover:text-foreground"
              title="Recarregar dados"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Itens Distintos</span>
              <Package className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-1 font-tabular text-2xl font-bold text-primary">{totalUnique}</p>
            <p className="mt-1 text-xs text-muted-foreground">Tipos de itens presentes no baú</p>
          </div>

          <div className="rounded-lg border border-white/10 bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Volume Total de Unidades</span>
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-1 font-tabular text-2xl font-bold text-foreground">{totalUnits}</p>
            <p className="mt-1 text-xs text-muted-foreground">Peças e materiais acumulados</p>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400">Atendimento de Fila</span>
              <Users className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-1 font-tabular text-2xl font-bold text-amber-400">{totalAlerts}</p>
            <p className="mt-1 text-xs text-muted-foreground">Itens em estoque com pedidos pendentes</p>
          </div>
        </div>
      </section>

      {/* Abas Principais: Estoque do Baú vs Solicitações dos Membros */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          onClick={() => setActiveMainTab('inventory')}
          className={`pb-3 px-4 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeMainTab === 'inventory'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="h-4 w-4" />
          Estoque do Baú ({totalUnique})
        </button>

        <button
          onClick={() => setActiveMainTab('requests')}
          className={`pb-3 px-4 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeMainTab === 'requests'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          Solicitações dos Membros
          {(staffRequestsQuery.data?.length ?? 0) > 0 && (
            <span className="rounded-full bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 font-bold border border-amber-500/30 animate-pulse">
              {staffRequestsQuery.data?.length}
            </span>
          )}
        </button>
      </div>

      {activeMainTab === 'inventory' && (
        <>
      {/* Queue Alert Banner */}
      {totalAlerts > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 to-card/60 p-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                <Users className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <p className="font-semibold text-amber-300">
                  {totalAlerts} {totalAlerts === 1 ? 'item em estoque possui pedidos' : 'itens em estoque possuem pedidos'} na fila do Codex!
                </p>
                <p className="text-xs text-muted-foreground">
                  A liderança pode despachar manualmente cada peça observando a assiduidade dos jogadores da guilda.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-card/40 p-4">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="min-w-[140px]"
          >
            <option value="ALL">Todas Raridades</option>
            <option value="heroic">Heroico</option>
            <option value="rare">Raro</option>
            <option value="uncommon">Incomum</option>
            <option value="common">Comum</option>
          </Select>

          <Select
            value={selectedKind}
            onChange={(e) => setSelectedKind(e.target.value)}
            className="min-w-[140px]"
          >
            <option value="ALL">Todos Tipos</option>
            <option value="equipment">Equipamento</option>
            <option value="material">Material</option>
            <option value="skillbook">Livro de Habilidade</option>
          </Select>
        </div>
      </div>

      {/* Inventory List */}
      <Card className="border-white/10 bg-card/50 shadow-rune backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Inventário Atual ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Carregando inventário do baú...
            </div>
          ) : items.length === 0 ? (
            <EmptyState title="Nenhum item encontrado">
              O baú está vazio ou nenhum item corresponde aos filtros selecionados. Use o botão de OCR para ler seus prints.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4">Raridade</th>
                    <th className="py-3 px-4">Tipo / Categoria</th>
                    <th className="py-3 px-4 text-center">Qtd em Estoque</th>
                    <th className="py-3 px-4">Fila do Codex</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((item) => {
                    const hasWaiters = item.queueCount > 0;
                    return (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <span className="text-primary font-semibold">{item.itemName}</span>
                            {item.source && (
                              <span className="text-[11px] text-muted-foreground">({item.source})</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">{getRarityBadge(item.category)}</td>
                        <td className="py-3 px-4 text-muted-foreground text-xs uppercase">
                          {item.itemType || item.kind || '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-tabular font-bold text-base text-foreground">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4">
                          {hasWaiters ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                                <Users className="h-3 w-3" />
                                {item.queueCount} aguardando
                              </span>
                              {item.queueWaiters[0] && (
                                <span className="text-xs text-muted-foreground">
                                  Top: <strong className="text-amber-400">{item.queueWaiters[0].playerName}</strong> ({item.queueWaiters[0].attendancePercentage}%)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">Sem pedidos ativos</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant={hasWaiters ? 'primary' : 'secondary'}
                              onClick={() => {
                                setDispatchItem(item);
                                setSelectedWaiter(item.queueWaiters[0] || null);
                                setDispatchQty(1);
                              }}
                              className={
                                hasWaiters
                                  ? 'h-8 px-2.5 text-xs gap-1.5 bg-amber-600 text-black hover:bg-amber-500 font-semibold'
                                  : 'h-8 px-2.5 text-xs gap-1.5'
                              }
                            >
                              <Send className="h-3.5 w-3.5" />
                              Distribuir
                            </Button>

                            <Button
                              variant="ghost"
                              onClick={() => {
                                setEditItem(item);
                                setEditQty(item.quantity);
                                setEditSource(item.source || '');
                              }}
                              className="h-8 w-8 px-0 text-muted-foreground hover:text-foreground"
                              title="Editar estoque"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              onClick={() => handleDelete(item)}
                              className="h-8 w-8 px-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              title="Remover do baú"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: SOLICITAÇÕES DOS MEMBROS (ATÉ 5 ITENS POR JOGADOR) */}
      {/* ========================================================================= */}
      {activeMainTab === 'requests' && (
        <Card className="border-white/10 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Solicitações de Itens do Baú da Guilda
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Membros podem solicitar até 5 itens ativos do Baú. Ao despachar, o estoque é baixado, o jogador é notificado e a vaga é liberada.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => staffRequestsQuery.refetch()}
                className="gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Atualizar Fila
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {staffRequestsQuery.isLoading ? (
              <div className="flex justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !staffRequestsQuery.data || staffRequestsQuery.data.length === 0 ? (
              <EmptyState title="Nenhuma solicitação pendente">
                Todos os pedidos de itens do Baú da Guilda foram atendidos ou recusados.
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Item Solicitado</th>
                      <th className="p-3">Qtd</th>
                      <th className="p-3">Jogador</th>
                      <th className="p-3">Assiduidade (30d)</th>
                      <th className="p-3">Data do Pedido</th>
                      <th className="p-3">Nota</th>
                      <th className="p-3 text-right">Ações da Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {staffRequestsQuery.data.map((req) => (
                      <tr key={req.id} className="hover:bg-white/[0.02]">
                        <td className="p-3">
                          <p className="font-semibold text-foreground">{req.storageItem?.itemName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {req.storageItem?.category && getRarityBadge(req.storageItem.category)}
                            <span className="text-xs text-muted-foreground">
                              (Estoque: {req.storageItem?.quantity ?? 0})
                            </span>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-primary">
                          {req.quantity}x
                        </td>
                        <td className="p-3">
                          <p className="font-medium text-foreground">{req.player?.nickname}</p>
                          <p className="text-xs text-muted-foreground">{req.player?.class}</p>
                        </td>
                        <td className="p-3">
                          <Badge tone={req.player && req.player.attendancePercentage >= 60 ? 'green' : 'gold'}>
                            {req.player?.attendancePercentage ?? 0}%
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(req.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                          {req.playerNote || '-'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleDispatchStaffRequest(req)}
                              disabled={dispatchStaffRequest.isPending || (req.storageItem?.quantity ?? 0) < req.quantity}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 gap-1 font-semibold"
                              title={
                                (req.storageItem?.quantity ?? 0) < req.quantity
                                  ? 'Estoque insuficiente no baú'
                                  : 'Despachar item e dar baixa no estoque'
                              }
                            >
                              <Send className="h-3 w-3" />
                              Enviar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRejectStaffRequest(req)}
                              disabled={rejectStaffRequest.isPending}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs h-8"
                              title="Rejeitar pedido e liberar vaga do jogador"
                            >
                              <X className="h-3.5 w-3.5" />
                              Rejeitar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BATCH SCAN OCR GEMINI */}
      {/* ========================================================================= */}
      {scanModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-4xl rounded-xl border border-primary/40 bg-card p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <div>
                  <h2 className="text-xl font-bold text-foreground">Importar Prints com Gemini Vision</h2>
                  <p className="text-xs text-muted-foreground">
                    Carregue ou cole múltiplos prints do baú/histórico de drops (até 20 prints por vez).
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  setScanModalOpen(false);
                  setSelectedImages([]);
                  setScannedResults([]);
                }}
                className="h-8 w-8 px-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* If no scan results yet, show Upload Area */}
            {scannedResults.length === 0 ? (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) {
                      Array.from(e.dataTransfer.files).forEach((f) => addImageFile(f));
                    }
                  }}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-background/50 p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all"
                >
                  <Upload className="h-10 w-10 text-primary/70 mb-2" />
                  <p className="text-sm font-semibold text-foreground">
                    Clique para selecionar arquivos ou arraste os prints aqui
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Suporta PNG, JPG, WEBP. Você também pode colar diretamente via <strong>Ctrl + V</strong>.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>

                {/* Previews of selected images */}
                {selectedImages.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Prints selecionados ({selectedImages.length} / 20)
                      </span>
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedImages([])}
                        className="h-8 px-2 text-xs text-red-400 hover:text-red-300"
                      >
                        Limpar todos
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-48 overflow-y-auto p-1">
                      {selectedImages.map((img, idx) => (
                        <div key={idx} className="group relative rounded-lg border border-white/10 bg-background overflow-hidden">
                          <img src={img.data} alt={img.name} className="h-20 w-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(idx);
                            }}
                            className="absolute top-1 right-1 rounded-full bg-black/80 p-1 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <p className="truncate p-1 text-[10px] text-muted-foreground">{img.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!configData?.hasConfiguredKey && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                    <p className="font-semibold">Nenhuma chave Gemini configurada no sistema!</p>
                    <p className="mt-1">
                      Informe uma API Key temporária abaixo ou configure uma chave permanente pelo botão de configuração.
                    </p>
                    <Input
                      placeholder="AIzaSy..."
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setScanModalOpen(false);
                      setSelectedImages([]);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleScanSubmit}
                    disabled={selectedImages.length === 0 || scanMutation.isPending || Boolean(scanProgress)}
                    className="gap-2 bg-primary text-primary-foreground font-semibold"
                  >
                    {scanProgress ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Lendo print {scanProgress.current} de {scanProgress.total}...
                      </>
                    ) : scanMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Lendo prints com Gemini...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Processar {selectedImages.length} {selectedImages.length === 1 ? 'Print' : 'Prints'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* Review Scanned Items Step */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Revise os itens identificados antes de confirmar a adição ao baú:
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => setScannedResults([])}
                    className="h-8 px-2.5 gap-1 text-xs"
                  >
                    Voltar aos prints
                  </Button>
                </div>

                <div className="max-h-96 overflow-y-auto rounded-lg border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-background/80 text-xs uppercase tracking-wider text-muted-foreground sticky top-0">
                      <tr className="border-b border-white/10">
                        <th className="py-2.5 px-3">Item</th>
                        <th className="py-2.5 px-3">Raridade</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3 text-center">Quantidade</th>
                        <th className="py-2.5 px-3">Catálogo / Fila</th>
                        <th className="py-2.5 px-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {scannedResults.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="py-2.5 px-3">
                            <Input
                              value={item.itemName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setScannedResults((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, itemName: val } : it)),
                                );
                              }}
                              className="h-8 text-xs font-semibold"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <Select
                              value={item.category}
                              onChange={(e) => {
                                const val = e.target.value;
                                setScannedResults((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, category: val } : it)),
                                );
                              }}
                              className="h-8 text-xs min-w-[100px]"
                            >
                              <option value="heroic">Heroico</option>
                              <option value="rare">Raro</option>
                              <option value="uncommon">Incomum</option>
                              <option value="common">Comum</option>
                            </Select>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground uppercase">
                            {item.itemType || item.kind || 'Outro'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                setScannedResults((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it)),
                                );
                              }}
                              className="h-8 w-20 text-center text-xs font-bold mx-auto"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col gap-0.5 text-xs">
                              {item.catalogMatched ? (
                                <span className="text-emerald-400 font-semibold">✓ No catálogo</span>
                              ) : (
                                <span className="text-muted-foreground">Item novo</span>
                              )}
                              {item.queueAlertCount > 0 && (
                                <span className="text-amber-400 font-bold">
                                  {item.queueAlertCount} pedido(s) na fila!
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              variant="ghost"
                              onClick={() => setScannedResults((prev) => prev.filter((_, i) => i !== idx))}
                              className="h-7 w-7 px-0 text-red-400 hover:text-red-300"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-xs text-muted-foreground">
                    Total: <strong>{scannedResults.length}</strong> tipos de itens (
                    {scannedResults.reduce((acc, curr) => acc + curr.quantity, 0)} unidades)
                  </span>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setScanModalOpen(false);
                        setSelectedImages([]);
                        setScannedResults([]);
                      }}
                    >
                      Descartar
                    </Button>
                    <Button
                      onClick={handleConfirmImport}
                      disabled={importMutation.isPending}
                      className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500 font-semibold"
                    >
                      {importMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Gravando no Baú...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Confirmar e Adicionar ao Baú
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DISPATCH TO CODEX QUEUE (ATTENDANCE RATE AWARE) */}
      {/* ========================================================================= */}
      {dispatchItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl rounded-xl border border-primary/40 bg-card p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Distribuir: {dispatchItem.itemName}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Estoque disponível no baú: <strong className="text-primary">{dispatchItem.quantity} unidade(s)</strong>
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  setDispatchItem(null);
                  setSelectedWaiter(null);
                }}
                className="h-8 w-8 px-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {dispatchItem.queueWaiters.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <p>Não há jogadores aguardando este item na fila do Codex no momento.</p>
                <p className="text-xs mt-1">
                  Se um jogador fizer o pedido pelo Codex, o item aparecerá aqui com sua taxa de assiduidade.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fila de Espera no Codex (Ordenada por Assiduidade):
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {dispatchItem.queueWaiters.map((waiter) => {
                    const isSelected = selectedWaiter?.requestId === waiter.requestId;
                    return (
                      <div
                        key={waiter.requestId}
                        onClick={() => setSelectedWaiter(waiter)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 shadow-md'
                            : 'border-white/10 bg-background/50 hover:border-primary/40 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-muted-foreground">
                            #{waiter.rankPosition}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{waiter.playerName}</span>
                              {waiter.playerClass && (
                                <span className="text-[10px] uppercase text-muted-foreground">
                                  ({waiter.playerClass})
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Pedido: {waiter.remainingQuantity} restante(s) de {waiter.totalQuantity}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/60 bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 shadow-sm">
                            ★ {waiter.attendancePercentage}% Assiduidade
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedWaiter && (
                  <div className="rounded-lg border border-white/10 bg-background/60 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Confirmar Envio para {selectedWaiter.playerName}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Qtd a Despachar</label>
                        <Input
                          type="number"
                          min={1}
                          max={Math.min(dispatchItem.quantity, selectedWaiter.remainingQuantity)}
                          value={dispatchQty}
                          onChange={(e) => setDispatchQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground">Justificativa / Observação</label>
                        <Input
                          placeholder="Ex: Priorizado por assiduidade no boss"
                          value={dispatchReason}
                          onChange={(e) => setDispatchReason(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      * A entrega dará baixa automática no estoque do baú e registrará a entrega na auditoria e no histórico do jogador.
                    </p>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="secondary"
                        onClick={() => setSelectedWaiter(null)}
                      >
                        Trocar Jogador
                      </Button>
                      <Button
                        onClick={handleConfirmDispatch}
                        disabled={dispatchMutation.isPending}
                        className="gap-2 bg-gradient-to-r from-amber-600 to-amber-500 font-semibold text-black hover:from-amber-500 hover:to-amber-400"
                      >
                        {dispatchMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Processando entrega...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Confirmar Entrega ({dispatchQty}x)
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: GEMINI CONFIGURATION */}
      {/* ========================================================================= */}
      {configModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md rounded-xl border border-primary/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Configurar Google Gemini API</h3>
              </div>
              <Button
                variant="ghost"
                onClick={() => setConfigModalOpen(false)}
                className="h-8 w-8 px-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Insira a chave da API do Google Gemini (Google AI Studio) utilizada para a visão multimodal de OCR dos prints de drops e baú.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Gemini API Key</label>
              <Input
                type="password"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Status atual:{' '}
                {configData?.hasConfiguredKey ? (
                  <span className="text-emerald-400 font-semibold">Chave ativa no servidor</span>
                ) : (
                  <span className="text-amber-400 font-semibold">Nenhuma chave configurada</span>
                )}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button variant="secondary" onClick={() => setConfigModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveConfig}
                disabled={setConfigMutation.isPending || !apiKeyInput.trim()}
                className="gap-1.5 bg-primary font-semibold"
              >
                {setConfigMutation.isPending ? 'Salvando...' : 'Salvar Chave'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT ITEM STOCK */}
      {/* ========================================================================= */}
      {editItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-sm rounded-xl border border-primary/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold">Editar Estoque: {editItem.itemName}</h3>
              <Button
                variant="ghost"
                onClick={() => setEditItem(null)}
                className="h-8 w-8 px-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Quantidade em Estoque</label>
                <Input
                  type="number"
                  min={0}
                  value={editQty}
                  onChange={(e) => setEditQty(Math.max(0, parseInt(e.target.value) || 0))}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Origem / Fonte</label>
                <Input
                  placeholder="Ex: Drop Boss Floud"
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <Button variant="secondary" onClick={() => setEditItem(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="bg-primary font-semibold"
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
