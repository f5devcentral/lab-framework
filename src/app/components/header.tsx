import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="bg-white shadow">
      <nav className="mx-auto flex max-w-384 items-center justify-between p-6 lg:px-8">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 no-underline">
            <span className="sr-only">Lab Framework</span>
            <Image
              src="/lab-framework-logo.png"
              alt="Lab Framework"
              width={50}
              height={50}
              loading="eager"
              style={{ width: "auto", height: "auto" }}
            />
          </Link>
        </div>
        <div className="flex justify-end lg:flex-1">
          <Link href="/" className="text-gray-900 no-underline hover:text-gray-900">
            Home
          </Link>
        </div>
      </nav>
    </header>
  );
}
