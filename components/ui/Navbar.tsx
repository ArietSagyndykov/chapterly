"use client";
import { cn } from "@/lib/utils";
import { SignInButton, useAuth, UserButton, useUser } from "@clerk/nextjs";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const navItems = [
  { label: "Library", href: "/" },
  { label: "Add New", href: "/books" },
];
const Navbar = () => {
  const pathName = usePathname();
  const { user, isSignedIn } = useUser();

  return (
    <header className="w-full fixed-50 bg-(--'bg-primary') ">
      <div className="wrapper navbar-height py-4 flex justify-between items-center">
        <Link href="/" className="flex gap-0.5 items-center">
          <Image
            src="/assets/logo.png"
            alt="Chapterly"
            width={42}
            height={26}
          />
          <span className="logo-text">Chapterly</span>
        </Link>
        <nav className="w-fit flex gap-7.5 items-center">
          <div className="flex gap-7.5 items-center">
            {navItems.map(({ label, href }) => {
              const isActive =
                pathName === href ||
                (href !== "/" && pathName.startsWith(href));
              return (
                <Link
                  href={href}
                  key={label}
                  className={cn(
                    "nav-link-base",
                    isActive ? "nav-link-active" : "text-black hover:opacity-70"
                  )}
                >
                  {" "}
                  {label}
                </Link>
              );
            })}

            <div className="nav-user-link">
              {isSignedIn ? <UserButton /> : <SignInButton />}
              {user?.firstName && (
                <Link href="/subscriptions" className="nav-user-name">
                  {user.firstName}
                </Link>
              )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
