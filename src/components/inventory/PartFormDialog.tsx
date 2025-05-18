
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
  mrp: z.string().min(1, "MRP is required"), // Basic validation, could be enhanced for currency format
  shelf: z.string().optional(),
});

export type PartFormData = z.infer<typeof partSchema>;

interface PartFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PartFormData, originalPartNumber?: string) => void;
  initialData?: Part | null;
  dialogTitle: string;
  existingPartNumbers: string[];
}

export function PartFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  initialData,
  dialogTitle,
  existingPartNumbers,
}: PartFormDialogProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    setError,
  } = useForm<PartFormData>({
    resolver: zodResolver(partSchema),
  });

  const isEditMode = !!initialData;

  useEffect(() => {
    if (initialData) {
      setValue("partName", initialData.partName);
      setValue("otherName", initialData.otherName || "");
      setValue("partNumber", initialData.partNumber);
      setValue("company", initialData.company || "");
      setValue("quantity", initialData.quantity);
      setValue("category", initialData.category);
      setValue("mrp", initialData.mrp);
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
  }, [initialData, reset, setValue, isOpen]); // isOpen ensures reset when dialog reopens for add

  const handleFormSubmit: SubmitHandler<PartFormData> = (data) => {
    if (!isEditMode && existingPartNumbers.includes(data.partNumber)) {
      setError("partNumber", { type: "manual", message: "Part Number must be unique." });
      toast({
        title: "Error",
        description: "Part Number already exists. Please use a unique Part Number.",
        variant: "destructive",
      });
      return;
    }
    onSubmit(data, initialData?.partNumber);
    reset(); // Reset form after submission
    onOpenChange(false); // Close dialog
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) reset(); // Reset form if dialog is closed via X or overlay click
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Edit the details of the part." : "Enter the details for the new part."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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
            <Input id="partNumber" {...register("partNumber")} disabled={isEditMode} />
            {errors.partNumber && <p className="text-sm text-destructive">{errors.partNumber.message}</p>}
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
              <Input id="mrp" {...register("mrp")} placeholder="$0.00 or ₹0.00" />
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
            <Button type="submit">{isEditMode ? "Save Changes" : "Add Part"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
