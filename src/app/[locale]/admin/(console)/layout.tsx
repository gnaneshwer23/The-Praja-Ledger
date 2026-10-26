import { requireConsole } from "@/lib/auth/console";
import { ConsoleNav } from "@/components/admin/console-nav";

export const instant = false;

export default async function ConsoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { staff } = await requireConsole(locale);
  return (
    <>
      <ConsoleNav role={staff.role} />
      {children}
    </>
  );
}
