import { companyColor } from '../../lib/statusStyles';

// Initial-in-a-rounded-box avatar for a company. Sizing/typography comes
// from `className`; color defaults to the deterministic company palette but
// can be overridden (e.g. the detail header pins indigo).
export function CompanyAvatar({ name, className = '', color }: {
  name: string;
  className?: string;
  color?: string;
}) {
  return (
    <div className={`rounded-xl flex items-center justify-center font-black font-display border shrink-0 ${color ?? companyColor(name)} ${className}`}>
      {name.trim().charAt(0)}
    </div>
  );
}
