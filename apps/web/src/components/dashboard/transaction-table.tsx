'use client';

import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { Transaction } from '@/types/api';

export function TransactionTable({ transactions = [] }: { transactions?: Transaction[] }) {
  const locale = useLocaleStore((state) => state.locale);

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="p-3">{t(locale, 'typeLabel')}</th>
            <th className="p-3">{t(locale, 'amount')}</th>
            <th className="p-3">{t(locale, 'reference')}</th>
            <th className="p-3">{t(locale, 'date')}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr><td className="p-4 text-muted-foreground" colSpan={4}>{t(locale, 'noTransactionsFound')}</td></tr>
          ) : transactions.map((transaction) => (
            <tr key={transaction.id} className="border-t">
              <td className="p-3">{transaction.type}</td>
              <td className="p-3 font-semibold">{transaction.amount}</td>
              <td className="p-3 text-muted-foreground">{transaction.referenceId ?? '-'}</td>
              <td className="p-3">{new Date(transaction.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
