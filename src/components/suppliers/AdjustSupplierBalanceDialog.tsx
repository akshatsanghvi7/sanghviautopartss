
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Supplier } from '@/lib/types';
import { useEffect } from "react";

const adjustBalanceSchema = z.object({
  newBalance: z.coerce.number({
    invalid_type_error: "Balance must be a number.",
    required_error: "Balance is required."
  }),
});

export type AdjustBalanceFormData = z.infer<typeof adjustBalanceSchema>;

interface AdjustSupplierBalanceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onSubmit: (supplierId: string, newBalance: number) => void;
}

export function AdjustSupplierBalanceDialog({
  isOpen,
  onOpenChange,
  supplier,
  onSubmit,
}: AdjustSupplierBalanceDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AdjustBalanceFormData>({
    resolver: zodResolver(adjustBalanceSchema),
  });

  useEffect(() => {
    if (isOpen && supplier) {
      setValue("newBalance", supplier.balance);
    } else if (!isOpen) {
      reset({ newBalance: 0 });
    }
  }, [isOpen, supplier, setValue, reset]);

  const handleFormSubmit: SubmitHandler<AdjustBalanceFormData> = (data) => {
    if (supplier) {
      onSubmit(supplier.id, data.newBalance);
    }
    onOpenChange(false);
  };

  if (!supplier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Balance for {supplier.name}</DialogTitle>
          <DialogDescription>
            Manually set the new total balance owed to this supplier. Use this, for example, after making a payment to update the amount you owe. Current balance: ${supplier.balance.toFixed(2)}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="newBalance">New Balance Owed ($)</Label>
            <Input
              id="newBalance"
              type="number"
              step="0.01"
              {...register("newBalance")}
              placeholder="Enter new balance"
            />
            {errors.newBalance && <p className="text-sm text-destructive">{errors.newBalance.message}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save New Balance</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
