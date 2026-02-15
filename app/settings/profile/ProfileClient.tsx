"use client";

import React, { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Camera, Save, User as UserIcon, Mail, Shield, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { getRoleInfo } from "@/lib/rbac";
import type { UserRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";

interface ProfileClientProps {
  initialName: string | null;
  initialImage: string | null;
  email: string;
  role: UserRole;
  emailVerified: Date | null;
}

export default function ProfileClient({
  initialName,
  initialImage,
  email,
  role,
  emailVerified,
}: ProfileClientProps) {
  const { update } = useSession();
  const [name, setName] = useState(initialName || "");
  const [avatar, setAvatar] = useState(initialImage || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roleInfo = getRoleInfo(role);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Avatar must be less than 2MB",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatar(base64);
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: "Could not read image file",
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "An error occurred while uploading",
      });
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, image: avatar }),
      });

      if (!res.ok) {
        throw new Error("Failed to update profile");
      }

      // Update session
      await update({ name, image: avatar });

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Could not save your profile",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = name !== initialName || avatar !== initialImage;

  return (
    <div className="space-y-6">
      {/* Avatar & Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal information and avatar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-start gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="flex-1 space-y-1">
              <div className="text-sm font-medium">Profile Picture</div>
              <div className="text-xs text-muted-foreground">
                JPG, PNG or GIF. Max size 2MB.
              </div>
              {isUploading && (
                <div className="text-xs text-primary">Uploading...</div>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/50">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{email}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {emailVerified ? "Verified" : "Not verified"}
            </p>
          </div>

          {/* Save Button */}
          {hasChanges && (
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Role & Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Role & Permissions</CardTitle>
          <CardDescription>Your current role and access level</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", `bg-${roleInfo.color}-100 dark:bg-${roleInfo.color}-900/20`)}>
                <Shield className={cn("w-5 h-5", `text-${roleInfo.color}-600 dark:text-${roleInfo.color}-400`)} />
              </div>
              <div>
                <div className="font-medium">{roleInfo.label}</div>
                <div className="text-sm text-muted-foreground">{roleInfo.description}</div>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Contact your administrator to request a role change.
          </div>
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Information about your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Email verified:</span>
            <span className="font-medium">
              {emailVerified ? new Date(emailVerified).toLocaleDateString() : "Not verified"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>
            Change Password (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
