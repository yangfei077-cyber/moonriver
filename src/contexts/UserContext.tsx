'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';

interface UserContextType {
  user: any;
  roles: string[];
  isAdmin: boolean;
  isCreator: boolean;
  isStudent: boolean;
  loadingRoles: boolean;
  displayName: string;
  setDisplayName: (name: string) => void;
  hasCompletedOnboarding: boolean;
  loadingOnboarding: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [roles, setRoles] = useState<string[]>(['Student']);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);

  useEffect(() => {
    const fetchUserRoles = async () => {
      if (!user?.sub) {
        return;
      }
      setLoadingRoles(true);
      try {
        const response = await fetch('/api/user-roles');
        if (response.ok) {
          const data = await response.json();
          setRoles(data.roles || ['Student']);
        } else {
          setRoles(['Student']);
        }
      } catch {
        setRoles(['Student']);
      } finally {
        setLoadingRoles(false);
      }
    };

    fetchUserRoles();
  }, [user?.sub]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const response = await fetch(`/api/user-profile?userId=${encodeURIComponent(user.email || user.sub || '')}`);
        const data = await response.json();
        if (data.success && data.profile) {
          setDisplayName(data.profile.displayName || user.name || user.email || '');
        } else {
          setDisplayName(user.name || user.email || '');
        }
      } catch {
        setDisplayName(user.name || user.email || '');
      }
    };
    if (user) fetchProfile();
  }, [user]);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user?.email) {
        setLoadingOnboarding(false);
        return;
      }
      try {
        const res = await fetch(`/api/questionnaire?email=${encodeURIComponent(user.email)}`);
        const data = await res.json();
        setHasCompletedOnboarding(!!data.questionnaire);
      } catch {
        setHasCompletedOnboarding(false);
      } finally {
        setLoadingOnboarding(false);
      }
    };
    checkOnboarding();
  }, [user?.email]);

  const isAdmin = roles.includes('Admin');
  const isCreator = roles.includes('Creator');
  const isStudent = roles.includes('Student');

  return (
    <UserContext.Provider value={{ user, roles, isAdmin, isCreator, isStudent, loadingRoles, displayName, setDisplayName, hasCompletedOnboarding, loadingOnboarding }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}
