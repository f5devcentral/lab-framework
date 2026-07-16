import { ToC } from "@/app/components/toc"
import { InstancesContextProvider } from "@/app/contexts/instances";
import { ReactNode } from "react";

interface MdxLayoutProps {
  children: ReactNode;
}

export default function MdxLayout({ children }: MdxLayoutProps) {

  return (
    <InstancesContextProvider>
      <div className="flex">
        <div className="sticky top-0 mt-0 h-screen shrink-0 self-start overflow-y-auto border-r border-slate-300 bg-slate-100 pl-2 pr-2 shadow-sm">
          <ToC />
        </div>
        <div className="min-w-0 grow overflow-x-hidden p-4 md:pr-10 sm:pr-4 md:flex-wrap md:justify-center">
          {children}
        </div>
      </div>
    </InstancesContextProvider>
  )
}