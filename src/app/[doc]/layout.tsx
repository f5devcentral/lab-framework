import { ToC } from "@/app/components/toc"
import { ReactNode } from "react";

interface MdxLayoutProps {
  children: ReactNode;
}

export default function MdxLayout({ children }: MdxLayoutProps) {
  
  return (
    <div className="flex">
      <div className="mt-0 pt-0 pl-2 pr-0 bg-white">
        <ToC />
      </div>
      <div className="flex-grow p-4 md:pr-10 sm:pr-4 md:flex-wrap md:justify-center">
        {children}
      </div>
    </div>
  )
}