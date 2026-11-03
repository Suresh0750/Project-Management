import type { Metadata } from 'next';
import { UsersListPage } from '@/components/users/users-list-page';

export const metadata: Metadata = { title: 'Users · ProjectFlow' };

export default function Page() {
  return <UsersListPage />;
}
