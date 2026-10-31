import type { Metadata } from 'next';
import { CreateUserPage } from '@/components/users/create-user-page';

export const metadata: Metadata = { title: 'Add user · ProjectFlow' };

export default function Page() {
  return <CreateUserPage />;
}
