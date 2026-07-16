import type { Metadata } from 'next';
import AdminConsole from './AdminConsole';

export const metadata: Metadata = {
  title: 'COSMO — Market admin',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminConsole />;
}
