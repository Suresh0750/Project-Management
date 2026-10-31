import type { Metadata } from 'next';
import { CreateProjectPage } from '@/components/projects/create-project-page';

export const metadata: Metadata = { title: 'New project · ProjectFlow' };

export default function Page() {
  return <CreateProjectPage role="ADMIN" />;
}
