
'use server';

import type { UserProfile } from '@/lib/types';
import { readData, writeData } from '@/lib/file-data-utils';
import { revalidatePath } from 'next/cache';

const USER_PROFILES_FILE = 'user_profiles.json';

function deriveFullName(username: string): string {
  if (!username) return "User";
  return username
    .split(/[\s._-]+/) // Split by common delimiters
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function getUserProfile(username: string): Promise<UserProfile> {
  if (!username) {
    return { username: '', fullName: 'Guest User', email: '' };
  }
  const profiles = await readData<UserProfile[]>(USER_PROFILES_FILE, []);
  const userProfile = profiles.find(p => p.username === username);

  if (userProfile) {
    return userProfile;
  } else {
    // Return a default profile if none exists
    return {
      username: username,
      fullName: deriveFullName(username),
      email: `${username}@autocentral.app`, // Default placeholder
    };
  }
}

export async function saveUserProfile(profileData: UserProfile): Promise<{ success: boolean; message: string }> {
  if (!profileData.username) {
    return { success: false, message: 'Username is required to save profile.' };
  }
  try {
    let profiles = await readData<UserProfile[]>(USER_PROFILES_FILE, []);
    const existingProfileIndex = profiles.findIndex(p => p.username === profileData.username);

    if (existingProfileIndex !== -1) {
      profiles[existingProfileIndex] = profileData;
    } else {
      profiles.push(profileData);
    }

    await writeData(USER_PROFILES_FILE, profiles);
    revalidatePath('/profile'); // Revalidate the profile page
    revalidatePath('/layout'); // Revalidate layout if it uses profile info (e.g., user nav display name if it were from profile)
    return { success: true, message: 'Profile updated successfully.' };
  } catch (error) {
    console.error('Error saving user profile:', error);
    return { success: false, message: 'Failed to save profile.' };
  }
}
