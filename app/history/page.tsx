import { Receipt } from "lucide-react";
import EmptyState from "@/components/ui/empty-state";
import Link from "next/link";

export default function HistoryPage() {
  const transactions: unknown[] = [];

  return (
    <main className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Payment History</h1>
          <p className="text-dark-500 mt-1 text-sm">
            All your escrow transactions in one place.
          </p>
        </div>

        <div className="glass-card p-2">
          {transactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Once you contribute to an escrow, your payment history will appear here."
              action={{
                label: "Create Escrow",
                onClick: () => {
                  window.location.href = "/escrow/new";
                },
              }}
            />
          ) : (
            <ul>
              {transactions.map((tx, i) => (
                <li key={i}>{JSON.stringify(tx)}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-dark-500 hover:text-brand-400 transition-colors">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
