'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { currentUser } from '@/lib/api';
import { canManageUsers } from '@/lib/roles';
import PageHeader from '@/components/PageHeader';
import CreateUserModal from '@/components/users/CreateUserModal';
import RolesLegend from '@/components/users/RolesLegend';
import UsersTable from '@/components/users/UsersTable';
import { useUsers } from '@/components/users/useUsers';

export default function UsersPage() {
  const router = useRouter();
  const me = currentUser();
  const { users, loading, create, changeRole, remove } = useUsers();
  const [showCreate, setShowCreate] = useState(false);
  const isSuper = me?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (me && !canManageUsers(me.role)) router.replace('/dashboard');
  }, [me, router]);

  return (
    <div>
      <PageHeader
        title="Users"
        description={
          isSuper
            ? 'Invite people and give each one the access they need.'
            : 'Everyone with access to this blog. Only a super admin can change accounts.'
        }
        actions={
          isSuper && (
            <button onClick={() => setShowCreate(true)} className="btn btn-primary">
              <UserPlus /> Add user
            </button>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_17rem] items-start">
        <UsersTable
          users={users}
          loading={loading}
          meId={me?.id}
          canEdit={isSuper}
          onChangeRole={changeRole}
          onRemove={remove}
        />
        <RolesLegend />
      </div>

      <CreateUserModal
        open={isSuper && showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={create}
      />
    </div>
  );
}
