import { Metadata } from "next";
import EscrowDashboardClient from "./EscrowDashboardClient";

export async function generateMetadata({ params }: { params: { contractId: string } }): Promise<Metadata> {
  const shortId = params.contractId.length <= 10
    ? params.contractId
    : `${params.contractId.slice(0, 4)}...${params.contractId.slice(-4)}`;
  return {
    title: `Escrow Agreement ${shortId} | PayEasy`,
    description: `Monitor the real-time funding status and roommate contributions for rent escrow agreement ${params.contractId}.`,
  };
}

export default function EscrowDashboardPage({ params }: { params: { contractId: string } }) {
  return <EscrowDashboardClient contractId={params.contractId} />;
}

