'use client';

import Link from 'next/link';
import { ArrowRight, BellRing, CheckCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useMyNotifications, useNoticeBoard } from '@/hooks/use-profile-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

export default function NoticesPage() {
  const locale = useLocaleStore((state) => state.locale);
  const notices = useNoticeBoard();
  const notifications = useMyNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = (notifications.data ?? []).filter((notification) => !notification.readAt).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Mural interno</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'internalNotifications')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pendencias, leiloes fechando e avisos que precisam da sua atencao dentro do site.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" /> {t(locale, 'activeNotices')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(notices.data ?? []).map((notice) => (
            <Link key={`${notice.type}-${notice.id}`} href={notice.href} className="flex flex-col gap-3 rounded-md border bg-background/35 p-3 transition hover:border-primary md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{notice.title}</strong>
                  <Badge tone={notice.priority === 'high' ? 'red' : notice.priority === 'medium' ? 'gold' : 'blue'}>{notice.priority}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{notice.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-primary" />
            </Link>
          ))}
          {!notices.isLoading && (notices.data ?? []).length === 0 && <EmptyState title="Sem avisos agora">Quando tiver algo pedindo sua atencao, aparece aqui.</EmptyState>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              {t(locale, 'internalNotifications')}
              {unreadCount > 0 && <Badge tone="gold">{t(locale, 'unread')} {unreadCount}</Badge>}
            </CardTitle>
            <Button variant="secondary" disabled={unreadCount === 0 || markAllRead.isPending} onClick={() => markAllRead.mutate()}>
              <CheckCheck className="h-4 w-4" /> {t(locale, 'markAllAsRead')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(notifications.data ?? []).map((notification) => (
            <div key={notification.id} className={`rounded-md border p-3 ${notification.readAt ? 'bg-background/30' : 'border-primary/35 bg-primary/10'}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{notification.title}</strong>
                    {!notification.readAt && <Badge tone="gold">{t(locale, 'unread')}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.body}</p>
                  <p className="text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {notification.href && (
                    <Link href={notification.href}>
                      <Button variant="secondary">{t(locale, 'open')} <ArrowRight className="h-4 w-4" /></Button>
                    </Link>
                  )}
                  {!notification.readAt && (
                    <Button variant="ghost" disabled={markRead.isPending} onClick={() => markRead.mutate(notification.id)}>
                      {t(locale, 'markAsRead')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!notifications.isLoading && (notifications.data ?? []).length === 0 && (
            <EmptyState title={t(locale, 'noInternalNotifications')}>{t(locale, 'myPendingTasksEmpty')}</EmptyState>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
