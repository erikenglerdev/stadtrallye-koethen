import Dashboard from '@/components/Dashboard/Dashboard';
export const metadata={title:'Rallye · Live-Dashboard',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{simulation?:string}>}) {
  return <Dashboard simulation={process.env.NODE_ENV==='development' && (await searchParams).simulation==='1'} />;
}
