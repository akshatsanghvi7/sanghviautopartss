
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Palette, ShieldCheck } from 'lucide-react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [storedCompanyName, setStoredCompanyName] = useLocalStorage<string>('autocentral-settings-companyName', 'AutoCentral Inc.');
  const [storedCompanyAddress, setStoredCompanyAddress] = useLocalStorage<string>('autocentral-settings-companyAddress', '123 Auto Drive, Carville, ST 12345');
  const [lowStockAlertsEnabled, setLowStockAlertsEnabled] = useLocalStorage<boolean>('autocentral-settings-lowStockAlerts', true);
  
  const [localCompanyName, setLocalCompanyName] = useState(storedCompanyName);
  const [localCompanyAddress, setLocalCompanyAddress] = useState(storedCompanyAddress);

  const { toast } = useToast();

  useEffect(() => {
    setLocalCompanyName(storedCompanyName);
  }, [storedCompanyName]);

  useEffect(() => {
    setLocalCompanyAddress(storedCompanyAddress);
  }, [storedCompanyAddress]);

  const handleSaveChanges = () => {
    setStoredCompanyName(localCompanyName);
    setStoredCompanyAddress(localCompanyAddress);
    // lowStockAlertsEnabled is already saved by its onCheckedChange
    toast({
      title: "Settings Saved",
      description: "Your general settings have been updated.",
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        
        <div className="grid gap-6 lg:grid-cols-3">
          {/* General Settings Card */}
          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Manage application-wide preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input 
                  id="companyName" 
                  value={localCompanyName}
                  onChange={(e) => setLocalCompanyName(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Company Address</Label>
                <Input 
                  id="companyAddress" 
                  value={localCompanyAddress}
                  onChange={(e) => setLocalCompanyAddress(e.target.value)} 
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveChanges}>Save General Settings</Button>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar for other settings categories */}
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Notifications</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailNotifications" className="cursor-not-allowed opacity-50">Email Notifications</Label>
                  <Switch id="emailNotifications" disabled />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="lowStockAlerts">Low Stock Alerts</Label>
                  <Switch 
                    id="lowStockAlerts" 
                    checked={lowStockAlertsEnabled}
                    onCheckedChange={setLowStockAlertsEnabled} // This saves immediately, which is fine for a switch
                  />
                </div>
                <Button variant="outline" className="w-full" disabled>Manage Notification Preferences</Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Appearance</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Customize the look and feel of the app.</p>
                    <Button variant="outline" className="w-full" disabled>Customize Theme (Coming Soon)</Button>
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Security</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Manage security settings for your account.</p>
                     <Button variant="outline" className="w-full" disabled>Two-Factor Authentication (Coming Soon)</Button>
                </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
