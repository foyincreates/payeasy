import { Metadata } from "next";
import EscrowDashboardClient from "./EscrowDashboardClient";

export async function generateMetadata({ params }: { params: { contractId: string } }): Promise<Metadata> {
  const shortId = params.contractId.slice(0, 8);
  return {
    title: `Escrow Agreement ${shortId} | PayEasy`,
    description: `Monitor the real-time funding status and roommate contributions for rent escrow agreement ${params.contractId}.`,
  };
}

export default function EscrowDashboardPage({ params }: { params: { contractId: string } }) {
  return <EscrowDashboardClient contractId={params.contractId} />;
}
