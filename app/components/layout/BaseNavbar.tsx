"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Settings, LogOut } from "lucide-react";

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

  // Hide Navbar on:
  // 1. Root ("/") - The main editor
  // 2. Project Editor ("/projects/[id]") - NOT "/projects" dashboard
  // Logic: if pathname is "/" OR (starts with "/projects/" AND isn't just "/projects" or "/projects/new" if that existed)
  // Actually, checking if segments > 2 for projects is safe if strictly /projects/[id].
  const isEditor = pathname === "/" || (pathname.startsWith("/projects/") && pathname.split("/").filter(Boolean).length > 1);

  if (isEditor) return null;

  return (
    <header className="lg:container z-[99] py-4">
      <nav>
        <Card className="flex items-center justify-between px-6 py-3">
          {/* Left: ANC Logo */}
          <Link href="/" className="flex items-center">
            <img
              src="/anc-logo-blue.png"
              alt="ANC Proposal Engine"
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
                    // Handle sign out logic here
                    setShowSignOutDialog(false);
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
