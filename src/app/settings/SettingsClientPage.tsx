"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Palette, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, startTransition } from 'react';
import type { AppSettings } from './actions';
import { saveSettings } from './actions';

interface SettingsClientPageProps {
  initialSettings: AppSettings;
}

export function SettingsClientPage({ initialSettings }: SettingsClientPageProps) {
  const [companyName, setCompanyName] = useState(initialSettings.companyName);
  const [companyAddress, setCompanyAddress] = useState(initialSettings.companyAddress);
  const [lowStockAlertsEnabled, setLowStockAlertsEnabled] = useState(initialSettings.lowStockAlertsEnabled);
  const { toast } = useToast();

  useEffect(() => {
    setCompanyName(initialSettings.companyName);
    setCompanyAddress(initialSettings.companyAddress);
    setLowStockAlertsEnabled(initialSettings.lowStockAlertsEnabled);
  }, [initialSettings]);

  const handleSaveGeneralSettings = async () => {
    startTransition(async () => {
      const result = await saveSettings({ companyName, companyAddress, lowStockAlertsEnabled });
      if (result.success) {
        toast({ title: "Settings Saved", description: result.message });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };
  
  const handleLowStockAlertsToggle = async (checked: boolean) => {
    setLowStockAlertsEnabled(checked);
     startTransition(async () => {
      // Save immediately on toggle for switches
      const result = await saveSettings({ companyName, companyAddress, lowStockAlertsEnabled: checked });
      if (result.success) {
        toast({ title: "Low Stock Alerts " + (checked ? "Enabled" : "Disabled") });
      } else {
        // Revert UI if save failed
        setLowStockAlertsEnabled(!checked);
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Manage application-wide preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Company Address</Label>
              <Input id="companyAddress" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveGeneralSettings}>Save General Settings</Button>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader><div className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Notifications</CardTitle></div></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between"><Label htmlFor="emailNotifications" className="cursor-not-allowed opacity-50">Email Notifications</Label><Switch id="emailNotifications" disabled /></div>
              <div className="flex items-center justify-between">
                <Label htmlFor="lowStockAlerts">Low Stock Alerts</Label>
                <Switch id="lowStockAlerts" checked={lowStockAlertsEnabled} onCheckedChange={handleLowStockAlertsToggle} />
              </div>
              <Button variant="outline" className="w-full" disabled>Manage Notification Preferences</Button>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader><div className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Appearance</CardTitle></div></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground mb-4">Customize look and feel.</p><Button variant="outline" className="w-full" disabled>Customize Theme (Soon)</Button></CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Security</CardTitle></div></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground mb-4">Manage account security.</p><Button variant="outline" className="w-full" disabled>2FA (Soon)</Button></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}