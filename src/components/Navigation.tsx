"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "取引管理" },
    { href: "/dashboard", label: "融資管理" },
  ];

  return (
    <nav className="w-64 bg-gray-100 border-r h-full p-4">
      <h2 className="text-lg font-bold mb-4">メニュー</h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`block px-4 py-2 rounded ${
                pathname === link.href
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-200"
              }`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
