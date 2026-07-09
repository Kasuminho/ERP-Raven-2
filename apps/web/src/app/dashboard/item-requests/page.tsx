'use client';

import { AuthGuard } from '@/components/guards/auth-guard';
import { ItemRequestsPageContent } from './_components/item-request-panels';

export default function ItemRequestsPage() {
  return (
    <AuthGuard>
      <ItemRequestsPageContent />
    </AuthGuard>
  );
}
