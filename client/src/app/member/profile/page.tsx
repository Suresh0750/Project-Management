import type { Metadata } from 'next';
import { ProfilePage } from '@/components/settings/profile-page';

export const metadata: Metadata = { title: 'Profile · ProjectFlow' };

export default function Page() {
  return <ProfilePage role="MEMBER" />;
}
