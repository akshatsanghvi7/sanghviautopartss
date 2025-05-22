
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
import type { Customer } from '@/lib/types';
import { useEffect } from "react";

const adjustBalanceSchema = z.object({
  newBalance: z.coerce.number({
    invalid_type_error: "Amount Due must be a number.",
    required_error: "Amount Due is required."
  }),
});

export type AdjustBalanceFormData = z.infer<typeof adjustBalanceSchema>;

interface AdjustCustomerBalanceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSubmit: (customerId: string, newBalance: number) => void;
}

export function AdjustCustomerBalanceDialog({
  isOpen,
  onOpenChange,
  customer,
  onSubmit,
}: AdjustCustomerBalanceDialogProps) {
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
    if (isOpen && customer) {
      setValue("newBalance", customer.balance);
    } else if (!isOpen) {
      reset({ newBalance: 0 });
    }
  }, [isOpen, customer, setValue, reset]);

  const handleFormSubmit: SubmitHandler<AdjustBalanceFormData> = (data) => {
    if (customer) {
      onSubmit(customer.id, data.newBalance);
    }
    onOpenChange(false);
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Amount Due for {customer.name}</DialogTitle>
          <DialogDescription>
            Manually set the new total "Amount Due" for this customer. Current Amount Due: ₹{customer.balance.toFixed(2)}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="newBalance">New Amount Due (₹)</Label>
            <Input
              id="newBalance"
              type="number"
              step="0.01"
              {...register("newBalance")}
              placeholder="Enter new amount due"
            />
            {errors.newBalance && <p className="text-sm text-destructive">{errors.newBalance.message}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save New Amount Due</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
