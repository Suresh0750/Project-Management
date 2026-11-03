import type { Metadata } from 'next';
import { SettingsPage } from '@/components/settings/settings-page';

export const metadata: Metadata = { title: 'Settings · ProjectFlow' };

export default function Page() {
  return <SettingsPage role="ADMIN" />;
}
