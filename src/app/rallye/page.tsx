import Rally from '@/components/Rally/Rally';
import type {Metadata} from 'next';
export const metadata: Metadata = {title: 'Köthener Stadtrallye', description: '25 Stationen, eine Runde durch Köthen. Mit GPS-Bestätigung und Gesamtzeit.'};
export default async function Page({searchParams}: {searchParams: Promise<{simulation?: string}>}) {
  const params = await searchParams;
  return <Rally simulation={process.env.NODE_ENV === 'development' && params.simulation === '1'} />;
}
