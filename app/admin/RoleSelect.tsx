import type { Role } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/strings";

const ROLES = Object.keys(ROLE_LABELS) as Role[];

export function RoleSelect({
  defaultValue,
  onChange,
}: {
  defaultValue: Role;
  onChange?: (role: Role) => void;
}) {
  return (
    <select
      name="role"
      defaultValue={defaultValue}
      onChange={onChange && ((e) => onChange(e.target.value as Role))}
      aria-label="Uloga"
      className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}
