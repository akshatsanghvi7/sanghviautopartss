
"use client";

import type { Part } from '@/lib/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import React, { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const partSchema = z.object({
  partName: z.string().min(1, "Part Name is required"),
  otherName: z.string().optional(),
  partNumber: z.string().min(1, "Part Number is required"),
  company: z.string().optional(),
  quantity: z.coerce.number().min(0, "Quantity must be zero or a positive number"),
  category: z.string().min(1, "Category is required"),
  mrp: z.string().min(1, "MRP is required").refine(val => val.startsWith('₹') || /^\d+(\.\d{1,2})?$/.test(val), {
    message: "MRP must be a valid amount, optionally starting with ₹ (e.g., ₹100 or 100.50)"
  }),
  shelf: z.string().optional(),
});

export type PartFormData = z.infer<typeof partSchema>;

interface PartFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PartFormData, originalPartNumber?: string) => void;
  initialData?: Part | null;
  dialogTitle: string;
  formMode: 'add' | 'edit';
  existingPartNumbers: string[]; // Still useful for edit mode to prevent changing to another existing number if needed
}

export function PartFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  initialData,
  dialogTitle,
  formMode,
  existingPartNumbers, 
}: PartFormDialogProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    setError, // We might not need setError for partNumber uniqueness here anymore
  } = useForm<PartFormData>({
    resolver: zodResolver(partSchema),
  });

  useEffect(() => {
    if (isOpen) {
      if (formMode === 'edit' && initialData) {
        setValue("partName", initialData.partName);
        setValue("otherName", initialData.otherName || "");
        setValue("partNumber", initialData.partNumber);
        setValue("company", initialData.company || "");
        setValue("quantity", initialData.quantity);
        setValue("category", initialData.category);
        setValue("mrp", initialData.mrp);
        setValue("shelf", initialData.shelf || "");
      } else { // For 'add' mode or if initialData is not available for edit
        reset({
          partName: "",
          otherName: "",
          partNumber: "",
          company: "",
          quantity: 0,
          category: "",
          mrp: "",
          shelf: "",
        });
      }
    }
  }, [initialData, reset, setValue, isOpen, formMode]);

  const handleFormSubmitInternal: SubmitHandler<PartFormData> = (data) => {
    // Uniqueness for partNumber is now handled by the parent component's submit logic (add or update)
    // If formMode is 'add' and partNumber is intended to be unique globally, that check happens in InventoryPage
    // If formMode is 'edit', partNumber might be disabled or its change handled specially.
    // For now, we directly pass the data, assuming InventoryPage handles merging/updating.
    
    let formattedMrp = data.mrp;
    if (!formattedMrp.startsWith('₹')) {
        formattedMrp = `₹${parseFloat(formattedMrp).toFixed(2)}`;
    }
    
    onSubmit({ ...data, mrp: formattedMrp }, initialData?.partNumber);
    reset(); 
    onOpenChange(false); 
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) reset(); 
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {formMode === 'edit' ? "Edit the details of the part." : "Enter the details for the new part. If Part Number exists, it will be updated."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmitInternal)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="partName">Part Name</Label>
              <Input id="partName" {...register("partName")} />
              {errors.partName && <p className="text-sm text-destructive">{errors.partName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="otherName">Other Name (Optional)</Label>
              <Input id="otherName" {...register("otherName")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="partNumber">Part Number</Label>
            <Input id="partNumber" {...register("partNumber")} disabled={formMode === 'edit'} />
            {errors.partNumber && <p className="text-sm text-destructive">{errors.partNumber.message}</p>}
            {formMode === 'edit' && <p className="text-xs text-muted-foreground mt-1">Part Number cannot be changed during edit.</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="company">Company (Optional)</Label>
              <Input id="company" {...register("company")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" {...register("quantity")} />
              {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="category">Category</Label>
              <Input id="category" {...register("category")} />
              {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
            </div>
             <div className="space-y-1">
              <Label htmlFor="mrp">MRP</Label>
              <Input id="mrp" {...register("mrp")} placeholder="₹0.00" />
              {errors.mrp && <p className="text-sm text-destructive">{errors.mrp.message}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="shelf">Shelf (Optional)</Label>
            <Input id="shelf" {...register("shelf")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit">{formMode === 'edit' ? "Save Changes" : "Add/Update Part"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
