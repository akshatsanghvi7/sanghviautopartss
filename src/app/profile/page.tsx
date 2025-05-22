
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState } from 'react';

interface ProfileDetails {
  username: string;
  email: string;
  fullName: string;
  role: string;
  joinDate: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profileDetails, setProfileDetails] = useState<ProfileDetails | null>(null);

  useEffect(() => {
    if (user) {
      // Attempt to create a more presentable full name from username
      const nameParts = user.username.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1));
      const fullName = nameParts.join(' ');
      
      setProfileDetails({
        username: user.username,
        email: `${user.username}@autocentral.app`, // Placeholder email
        fullName: fullName,
        role: 'Administrator', // Static mock data
        joinDate: '2023-01-15', // Static mock data
      });
    }
  }, [user]);

  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1 && names[0].length > 0) return names[0].substring(0, 2).toUpperCase();
    if (names.length > 1 && names[0].length > 0 && names[names.length - 1].length > 0) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase(); // Fallback for single word or unexpected format
  }

  if (!profileDetails) {
    return (
      <div className="flex justify-center items-center h-full">
        <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">User Profile</h1>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Manage your personal and account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={`https://placehold.co/100x100.png?text=${getInitials(profileDetails.fullName)}`} alt={profileDetails.fullName} data-ai-hint="person portrait" />
              <AvatarFallback>{getInitials(profileDetails.fullName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1 text-center sm:text-left">
              <h2 className="text-2xl font-semibold">{profileDetails.fullName}</h2>
              <p className="text-muted-foreground">{profileDetails.email}</p>
              <p className="text-sm text-muted-foreground">Role: {profileDetails.role}</p>
              <p className="text-sm text-muted-foreground">Joined: {new Date(profileDetails.joinDate).toLocaleDateString()}</p>
            </div>
            <Button variant="outline" disabled>Change Avatar</Button>
          </div>

          <Separator />

          <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" defaultValue={profileDetails.fullName} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" defaultValue={profileDetails.username} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" defaultValue={profileDetails.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" defaultValue={profileDetails.role} disabled />
            </div>
          
            <div className="md:col-span-2 flex justify-end">
              <Button disabled>Save Changes</Button>
            </div>
          </form>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-2">Change Password</h3>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" disabled />
              </div>
              <div className="space-y-2">
                  {/* Empty div for spacing */}
              </div>
              <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" disabled />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" disabled />
              </div>
              <div className="md:col-span-2 flex justify-end">
                  <Button variant="secondary" disabled>Update Password</Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
