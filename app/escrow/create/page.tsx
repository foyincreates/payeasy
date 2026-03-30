import CreateEscrowForm from "@/components/escrow/CreateEscrowForm";

export default function CreateEscrowPage() {
  return (
    <main className="relative min-h-screen px-6 py-20">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-16 h-60 w-60 rounded-full bg-brand-600/10 blur-3xl" />
        <div className="absolute bottom-16 right-16 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-6">
        <div className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-300">Landlord Portal</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-dark-100">
            New Rent Escrow Agreement
          </h1>
          <p className="text-dark-500 max-w-2xl mx-auto">
            Configure amount, deadline, and roommate shares, then initialize and configure your escrow agreement on Stellar.
          </p>
        </div>

        <CreateEscrowForm />
      </div>
    </main>
  );
}
