'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { useToast } from '@/components/ui/toast-provider';
import { UserForm } from '@/components/users/user-form';
import { useCreateUser } from '@/features/users/hooks';
import { ASSIGNABLE_ROLES, type UserFormValues } from '@/schemas/user';

export function CreateUserPage() {
  const router = useRouter();
  const toast = useToast();
  const createUser = useCreateUser();

  const handleSubmit = async (values: UserFormValues) => {
    const role = ASSIGNABLE_ROLES.find((assignable) => assignable === values.role);
    if (!role) throw new Error('Invalid role');

    const user = await createUser.mutateAsync({
      name: values.name,
      email: values.email,
      password: values.password,
      role,
    });
    toast.success(`${user.name} was created`);
    router.push('/admin/users');
  };

  return (
    <div>
      <PageHeader
        title="Add user"
        description="Create a Project Manager or Member account."
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Users', href: '/admin/users' },
          { label: 'Add user' },
        ]}
      />
      <div className="max-w-xl rounded-xl border border-border bg-surface p-6">
        <UserForm
          mode="create"
          submitLabel="Create user"
          onSubmit={handleSubmit}
          onCancel={() => router.push('/admin/users')}
        />
      </div>
    </div>
  );
}
