import { ROLES, ROLE_DESCRIPTION, ROLE_DOT, ROLE_NAME } from '@/lib/roles';

export default function RolesLegend() {
  return (
    <aside className="card p-4">
      <h2 className="text-[0.8125rem] font-semibold mb-3">Roles</h2>
      <dl className="space-y-3.5">
        {ROLES.map((r) => (
          <div key={r}>
            <dt className="flex items-center gap-2 text-[0.8125rem] font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${ROLE_DOT[r]}`} />
              {ROLE_NAME[r]}
            </dt>
            <dd className="t-caption mt-0.5 pl-3.5">{ROLE_DESCRIPTION[r]}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
