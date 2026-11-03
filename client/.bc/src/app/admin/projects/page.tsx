import type { Metadata } from 'next';
import { ProjectsListPage } from '@/components/projects/projects-list-page';

export const metadata: Metadata = { title: 'Projects · ProjectFlow' };

export default function Page() {
  return <ProjectsListPage role="ADMIN" />;
}
