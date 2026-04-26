import { Users } from "lucide-react";
import EmptyState from "@/components/ui/empty-state";

interface Roommate {
  id: string;
  name: string;
  contribution: number;
}

interface RoommateListProps {
  roommates?: Roommate[];
  onInvite?: () => void;
}

export default function RoommateList({ roommates = [], onInvite }: RoommateListProps) {
  if (roommates.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No roommates yet"
        description="Invite roommates to join your escrow so everyone can contribute to rent."
        action={
          onInvite
            ? { label: "Invite Roommate", onClick: onInvite }
            : undefined
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-white/5">
      {roommates.map((roommate) => (
        <li
          key={roommate.id}
          className="flex items-center justify-between py-4 px-2"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-semibold text-sm">
              {roommate.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-white font-medium">{roommate.name}</span>
          </div>
          <span className="text-accent-400 font-semibold text-sm">
            ${roommate.contribution.toFixed(2)}
          </span>
        </li>
      ))}
    </ul>
  );
}
