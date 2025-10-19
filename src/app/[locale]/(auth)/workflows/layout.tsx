import { QueryProvider } from '@/providers/QueryProvider';

export default function WorkflowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <QueryProvider>{children}</QueryProvider>;
}
