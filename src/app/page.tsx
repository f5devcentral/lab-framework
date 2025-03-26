import Image from "next/image";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold text-center">
        Welcome to Lab Framework
      </h1>
      <Image
        src="/lab-framework-logo.png"
        alt="Lab Framework"
        width={200}
        height={200}
        style={{ width: "auto" }}
      />
      <p>The following are a list of pages in this lab.</p>
    </main>
  );
}
