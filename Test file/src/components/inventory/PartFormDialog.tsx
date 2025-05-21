
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
  onSubmit: (data: PartFormData, originalPart?: Part) => void; // Pass originalPart for edit context
  initialData?: Part | null; // This is the original Part object for editing
  dialogTitle: string;
  formMode: 'add' | 'edit';
}

export function PartFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  initialData,
  dialogTitle,
  formMode,
}: PartFormDialogProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<PartFormData>({
    resolver: zodResolver(partSchema),
  });

  const formatMrpForDisplay = (mrpString?: string): string => {
    if (!mrpString) return "";
    // If it already starts with ₹, use as is, otherwise prepend and format
    if (mrpString.startsWith('₹')) {
      return mrpString;
    }
    const numericValue = parseFloat(mrpString.replace(/[^0-9.-]+/g, ""));
    return isNaN(numericValue) ? "" : `₹${numericValue.toFixed(2)}`;
  };
  
  const formatMrpForStorage = (mrpString: string): string => {
    if (mrpString.startsWith('₹')) {
        const numericValue = parseFloat(mrpString.substring(1));
        return isNaN(numericValue) ? '₹0.00' : `₹${numericValue.toFixed(2)}`;
    }
    const numericValue = parseFloat(mrpString);
    return isNaN(numericValue) ? '₹0.00' : `₹${numericValue.toFixed(2)}`;
  };


  useEffect(() => {
    if (isOpen) {
      if (formMode === 'edit' && initialData) {
        setValue("partName", initialData.partName);
        setValue("otherName", initialData.otherName || "");
        setValue("partNumber", initialData.partNumber); // PartNumber is disabled for edit
        setValue("company", initialData.company || "");
        setValue("quantity", initialData.quantity);
        setValue("category", initialData.category);
        setValue("mrp", initialData.mrp); // MRP is disabled for edit
        setValue("shelf", initialData.shelf || "");
      } else { 
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
    const submittedDataWithFormattedMrp = {
      ...data,
      mrp: formatMrpForStorage(data.mrp),
    };
    onSubmit(submittedDataWithFormattedMrp, initialData || undefined); // Pass initialData as originalPart
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
            {formMode === 'edit' ? "Edit details for this part entry. Part Number and MRP cannot be changed." : 
            "Enter details. If Part Number and MRP match an existing entry, it will be updated. Otherwise, a new entry is created."}
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
              <Input id="mrp" {...register("mrp")} placeholder="₹0.00" disabled={formMode === 'edit'} />
              {errors.mrp && <p className="text-sm text-destructive">{errors.mrp.message}</p>}
              {formMode === 'edit' && <p className="text-xs text-muted-foreground mt-1">MRP cannot be changed during edit.</p>}
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
            <Button type="submit">{formMode === 'edit' ? "Save Changes" : "Add/Update Part Entry"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    