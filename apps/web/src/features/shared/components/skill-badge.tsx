import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

type Tier = 'easy' | 'medium' | 'hard';

interface SkillBadgeProps {
  skill: string;
  tier?: Tier;
  matched?: boolean;
  className?: string;
}

const tierConfig = {
  easy:   { label: 'Easy',   className: 'bg-success/15 text-success border-success/25 hover:bg-success/25',   icon: '↑' },
  medium: { label: 'Medium', className: 'bg-warning/15 text-warning border-warning/25 hover:bg-warning/25',   icon: '⚠' },
  hard:   { label: 'Hard',   className: 'bg-danger/15 text-danger border-danger/25 hover:bg-danger/25',    icon: '↑↑' },
};

export function SkillBadge({ skill, tier, matched = false, className = '' }: SkillBadgeProps) {
  if (matched) {
    return (
      <Badge variant="outline" className={`bg-accent/15 text-accent border-accent/25 hover:bg-accent/25 font-jetbrains-mono flex items-center gap-1 ${className}`}>
        {skill}
        <Check className="w-3 h-3 ml-1" />
      </Badge>
    );
  }

  if (tier) {
    const config = tierConfig[tier];
    return (
      <Badge variant="outline" className={`${config.className} font-jetbrains-mono flex items-center gap-1 ${className}`}>
        {skill}
        <span className="opacity-70 ml-1 text-[10px] tracking-wider uppercase">· {config.label} {config.icon}</span>
      </Badge>
    );
  }

  // Fallback for regular skills (e.g. required skills list on Job Detail)
  return (
    <Badge variant="outline" className={`bg-elevated text-primary border-border hover:bg-border-mid font-jetbrains-mono ${className}`}>
      {skill}
    </Badge>
  );
}
