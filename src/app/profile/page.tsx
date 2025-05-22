
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState, startTransition } from 'react';
import type { UserProfile } from '@/lib/types';
import { getUserProfile, saveUserProfile } from './actions';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [profileDetails, setProfileDetails] = useState<UserProfile | null>(null);
  const [fullNameInput, setFullNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Static details (not fetched from profile, but from auth or hardcoded for demo)
  const [role, setRole] = useState('Administrator');
  const [joinDate, setJoinDate] = useState('2023-01-15');

  useEffect(() => {
    if (user?.username) {
      setIsLoadingProfile(true);
      startTransition(async () => {
        const fetchedProfile = await getUserProfile(user.username);
        setProfileDetails(fetchedProfile);
        setFullNameInput(fetchedProfile.fullName);
        setEmailInput(fetchedProfile.email);
        setIsLoadingProfile(false);
      });
    } else {
      setIsLoadingProfile(false);
      setProfileDetails(null); // Clear profile if no user
    }
  }, [user]);

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1 && names[0].length > 0) return names[0].substring(0, 2).toUpperCase();
    if (names.length > 1 && names[0].length > 0 && names[names.length - 1].length > 0) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase(); // Fallback
  }

  const handleSaveChanges = async () => {
    if (!user?.username || !profileDetails) {
      toast({ title: "Error", description: "User not found.", variant: "destructive" });
      return;
    }
    const updatedProfile: UserProfile = {
      ...profileDetails,
      fullName: fullNameInput,
      email: emailInput,
    };
    startTransition(async () => {
      const result = await saveUserProfile(updatedProfile);
      if (result.success) {
        toast({ title: "Profile Updated", description: result.message });
        setProfileDetails(updatedProfile); // Update local state to reflect saved changes
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  if (isLoadingProfile) {
    return (
      <div className="flex justify-center items-center h-full">
        <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }
  
  if (!user || !profileDetails) {
     return (
      <div className="flex justify-center items-center h-full">
        <p>Please log in to view your profile.</p>
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
              <AvatarImage src={`https://placehold.co/100x100.png?text=${getInitials(fullNameInput || user.username)}`} alt={fullNameInput || user.username} data-ai-hint="person portrait" />
              <AvatarFallback>{getInitials(fullNameInput || user.username)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1 text-center sm:text-left">
              <h2 className="text-2xl font-semibold">{fullNameInput || 'N/A'}</h2>
              <p className="text-muted-foreground">{emailInput || 'N/A'}</p>
              <p className="text-sm text-muted-foreground">Role: {role}</p>
              <p className="text-sm text-muted-foreground">Joined: {new Date(joinDate).toLocaleDateString()}</p>
            </div>
            <Button variant="outline" disabled>Change Avatar</Button>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullNameInput} onChange={(e) => setFullNameInput(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={user.username} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={role} disabled />
            </div>
          
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={handleSaveChanges}>Save Changes</Button>
            </div>
          </div>

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
