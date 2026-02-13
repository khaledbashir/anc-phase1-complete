"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { Settings, LogOut, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BaseNavbar = () => {
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.authRole === "admin";

  // Hide Navbar on:
  // 1. Auth (login, etc.) - Standalone auth pages
  // 2. Root ("/") - The main editor
  // 3. Projects Dashboard ("/projects") - Dashboard view
  // 4. Project Editor ("/projects/[id]") - Individual project
  const isAuth = pathname.startsWith("/auth");
  const isEditor =
    pathname === "/" ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/share") ||
    pathname.startsWith("/tools") ||
    pathname.startsWith("/admin");

  if (isAuth || isEditor) return null;

  return (
    <header className="lg:container z-[99] py-4">
      <nav>
        <Card className="flex items-center justify-between px-6 py-3">
          {/* Left: ANC Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/anc-logo-blue.png"
              alt="ANC Proposal Engine"
              width={40}
              height={40}
              className="h-10 w-auto"
            />
          </Link>

          {/* Center: Workspaces Dropdown */}
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Workspaces</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[200px] gap-3 p-4">
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          href="/workspaces"
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">
                            All Workspaces
                          </div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            View and manage your workspaces
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          href="/workspaces/new"
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">
                            New Workspace
                          </div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Create a new workspace
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              {isAdmin && (
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/admin/users"
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium"
                    >
                      <Users className="h-4 w-4" />
                      Users
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              )}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right: User Profile */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-red-600"
              onClick={() => setShowSignOutDialog(true)}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>

          {/* Sign Out Confirmation Dialog */}
          <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to sign out of your account?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    setShowSignOutDialog(false);
                    signOut({ callbackUrl: "/auth/login" });
                  }}
                >
                  Sign out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      </nav>
    </header>
  );
};

export default BaseNavbar;
