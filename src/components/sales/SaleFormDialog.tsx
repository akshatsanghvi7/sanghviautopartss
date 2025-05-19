
"use client";

import type { Part, SaleItem } from '@/lib/types';
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
import { useForm, useFieldArray, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, PlusCircle, Search } from 'lucide-react';

const saleItemSchema = z.object({
  partNumber: z.string().min(1, "Part Number is required"),
  partName: z.string(), // Will be populated based on partNumber
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number(), // Will be populated
  // itemTotal: z.number(), // Will be calculated
});

const saleFormSchema = z.object({
  buyerName: z.string().min(1, "Buyer Name is required"),
  gstNumber: z.string().optional(),
  contactDetails: z.string().optional(),
  emailAddress: z.string().email("Invalid email address").optional().or(z.literal('')),
  saleDate: z.date({ required_error: "Sale Date is required" }).optional().nullable(), // Allow undefined/null initially
  paymentType: z.enum(['cash', 'credit'], { required_error: "Payment Type is required" }),
  items: z.array(saleItemSchema).min(1, "At least one item must be added to the sale"),
  discount: z.coerce.number().min(0, "Discount cannot be negative").optional(),
});

export type SaleFormData = z.infer<typeof saleFormSchema>;
type SaleFormItem = z.infer<typeof saleItemSchema>;


interface SaleFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SaleFormData) => void;
  inventoryParts: Part[];
}

export function SaleFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  inventoryParts,
}: SaleFormDialogProps) {
  const { toast } = useToast();
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues, // Added getValues
    formState: { errors },
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      saleDate: undefined, // Initialize as undefined for hydration safety
      items: [],
      discount: 0,
      paymentType: 'cash',
      buyerName: '',
      gstNumber: '',
      contactDetails: '',
      emailAddress: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const [currentPartNumberInput, setCurrentPartNumberInput] = useState('');
  const [currentQuantityInput, setCurrentQuantityInput] = useState<number | string>(1);
  const [selectedPartForAdding, setSelectedPartForAdding] = useState<Part | null>(null);
  const [partSearchTerm, setPartSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      // When dialog opens, if it's for a new sale (e.g., saleDate is not set),
      // set it to the current date.
      if (!getValues('saleDate')) {
        setValue('saleDate', new Date());
      }
    } else {
      // When dialog closes, reset the form.
      // Set saleDate to undefined to ensure consistency for next open.
      reset({
        saleDate: undefined,
        items: [],
        discount: 0,
        paymentType: 'cash',
        buyerName: '',
        gstNumber: '',
        contactDetails: '',
        emailAddress: '',
      });
      setCurrentPartNumberInput('');
      setCurrentQuantityInput(1);
      setSelectedPartForAdding(null);
      setPartSearchTerm('');
    }
  }, [isOpen, reset, setValue, getValues]);


  const handlePartSearch = (partNumber: string) => {
    setCurrentPartNumberInput(partNumber);
    const part = inventoryParts.find(p => p.partNumber.toLowerCase() === partNumber.toLowerCase());
    setSelectedPartForAdding(part || null);
    if (!part && partNumber) {
        toast({ title: "Part not found", description: `No part with number ${partNumber} in inventory.`, variant: "destructive"});
    }
  };

  const handleAddItem = () => {
    if (!selectedPartForAdding) {
      toast({ title: "No Part Selected", description: "Please enter a valid part number.", variant: "destructive" });
      return;
    }
    const quantity = Number(currentQuantityInput);
    if (isNaN(quantity) || quantity <= 0) {
      toast({ title: "Invalid Quantity", description: "Please enter a valid quantity greater than 0.", variant: "destructive" });
      return;
    }
    if (quantity > selectedPartForAdding.quantity) {
      toast({ title: "Insufficient Stock", description: `Only ${selectedPartForAdding.quantity} units of ${selectedPartForAdding.partName} available.`, variant: "destructive" });
      return;
    }

    const existingItemIndex = fields.findIndex(item => item.partNumber === selectedPartForAdding.partNumber);
    const unitPrice = parseFloat(selectedPartForAdding.mrp.replace(/[^0-9.-]+/g,"")) || 0;

    if (existingItemIndex > -1) {
      // Update quantity of existing item
      const existingItem = fields[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > selectedPartForAdding.quantity) {
         toast({ title: "Insufficient Stock", description: `Cannot add more. Total would exceed available ${selectedPartForAdding.quantity} units.`, variant: "destructive" });
         return;
      }
      setValue(`items.${existingItemIndex}.quantity`, newQuantity);
    } else {
      append({
        partNumber: selectedPartForAdding.partNumber,
        partName: selectedPartForAdding.partName,
        quantity: quantity,
        unitPrice: unitPrice,
      });
    }

    toast({ title: "Item Added", description: `${quantity} x ${selectedPartForAdding.partName} added to sale.` });
    setCurrentPartNumberInput('');
    setSelectedPartForAdding(null);
    setCurrentQuantityInput(1);
    setPartSearchTerm(''); // Clear search term
  };

  const watchedItems = watch("items");
  const subTotal = watchedItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  
  const watchedDiscountValue = watch("discount"); // This can be string, number, or undefined
  let numericDiscount = 0;
  if (typeof watchedDiscountValue === 'number') {
    numericDiscount = isNaN(watchedDiscountValue) ? 0 : watchedDiscountValue;
  } else if (typeof watchedDiscountValue === 'string' && watchedDiscountValue.trim() !== '') {
    const parsed = parseFloat(watchedDiscountValue);
    numericDiscount = isNaN(parsed) ? 0 : parsed;
  }
  // Ensure discount is not negative, consistent with schema min(0)
  numericDiscount = Math.max(0, numericDiscount);

  const netAmount = subTotal - numericDiscount;

  const filteredInventoryParts = inventoryParts.filter(part =>
    part.partName.toLowerCase().includes(partSearchTerm.toLowerCase()) ||
    part.partNumber.toLowerCase().includes(partSearchTerm.toLowerCase())
  ).slice(0, 5); // Limit results for performance

  const handleFormSubmitInternal: SubmitHandler<SaleFormData> = (data) => {
     if (!data.saleDate) {
      toast({ title: "Sale Date Missing", description: "Please select a sale date.", variant: "destructive" });
      return;
    }
    // Ensure discount is a number in the submitted data
    const submissionData = {
      ...data,
      discount: numericDiscount,
    };
    onSubmit(submissionData as SaleFormData & { saleDate: Date }); // Ensure saleDate is a Date for the parent
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New Sale</DialogTitle>
          <DialogDescription>Fill in the details for the new sale transaction.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmitInternal)} className="space-y-4">
        <ScrollArea className="h-[60vh] pr-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="buyerName">Buyer Name *</Label>
              <Input id="buyerName" {...register("buyerName")} />
              {errors.buyerName && <p className="text-sm text-destructive">{errors.buyerName.message}</p>}
            </div>
            <div>
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input id="gstNumber" {...register("gstNumber")} />
            </div>
            <div>
              <Label htmlFor="contactDetails">Contact Details</Label>
              <Input id="contactDetails" {...register("contactDetails")} />
            </div>
            <div>
              <Label htmlFor="emailAddress">Email Address</Label>
              <Input id="emailAddress" type="email" {...register("emailAddress")} />
              {errors.emailAddress && <p className="text-sm text-destructive">{errors.emailAddress.message}</p>}
            </div>
             <div>
              <Label htmlFor="saleDate">Sale Date *</Label>
              <Controller
                name="saleDate"
                control={control}
                render={({ field }) => (
                    <DatePicker
                        date={field.value || undefined} // Pass undefined if null/undefined
                        setDate={(date) => field.onChange(date)}
                    />
                )}
              />
              {errors.saleDate && <p className="text-sm text-destructive">{errors.saleDate.message}</p>}
            </div>
            <div>
              <Label htmlFor="paymentType">Payment Type *</Label>
               <Controller
                name="paymentType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paymentType && <p className="text-sm text-destructive">{errors.paymentType.message}</p>}
            </div>
          </div>

          <h3 className="text-lg font-medium border-t pt-4">Sale Items</h3>
          {errors.items && !errors.items.message && typeof errors.items === 'object' && (
            <p className="text-sm text-destructive">Please add at least one item to the sale.</p>
          )}
          {errors.items?.message && <p className="text-sm text-destructive">{errors.items.message}</p>}


          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end border p-4 rounded-md">
            <div className="md:col-span-2">
              <Label htmlFor="partSearch">Search Part (Name/Number)</Label>
              <div className="relative">
                <Input
                    id="partSearch"
                    value={partSearchTerm}
                    onChange={(e) => {
                        setPartSearchTerm(e.target.value);
                        if (!e.target.value) setSelectedPartForAdding(null);
                    }}
                    placeholder="Type to search..."
                />
                {partSearchTerm && filteredInventoryParts.length > 0 && (
                    <div className="absolute z-10 w-full bg-background border mt-1 rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredInventoryParts.map(part => (
                            <div
                                key={part.partNumber}
                                className="p-2 hover:bg-accent cursor-pointer"
                                onClick={() => {
                                    handlePartSearch(part.partNumber);
                                    setPartSearchTerm(part.partName); // Show name in search box after selection
                                }}
                            >
                                {part.partName} ({part.partNumber}) - Stock: {part.quantity}
                            </div>
                        ))}
                    </div>
                )}
              </div>
              {selectedPartForAdding && (
                 <p className="text-sm text-muted-foreground mt-1">
                    Selected: {selectedPartForAdding.partName} (Price: {selectedPartForAdding.mrp}, Stock: {selectedPartForAdding.quantity})
                 </p>
              )}
            </div>
             <div>
              <Label htmlFor="currentQuantityInput">Quantity *</Label>
              <Input
                id="currentQuantityInput"
                type="number"
                value={currentQuantityInput}
                onChange={(e) => setCurrentQuantityInput(e.target.value ? Number(e.target.value) : '')}
                min="1"
              />
            </div>
            <div className="md:col-span-3">
              <Button type="button" onClick={handleAddItem} className="w-full md:w-auto" disabled={!selectedPartForAdding}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item to Sale
              </Button>
            </div>
          </div>

          {fields.length > 0 && (
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Part No.</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.partName}</TableCell>
                      <TableCell>{item.partNumber}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" type="button" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 border-t pt-4">
            <div className="md:col-start-2">
              <Label htmlFor="discount">Discount ($)</Label>
              <Input id="discount" type="number" {...register("discount")} placeholder="0.00" step="0.01" />
              {errors.discount && <p className="text-sm text-destructive">{errors.discount.message}</p>}
            </div>
            <div className="space-y-1 text-right">
                <p className="text-muted-foreground">Subtotal: <span className="font-semibold text-foreground">${subTotal.toFixed(2)}</span></p>
                {numericDiscount > 0 && <p className="text-muted-foreground">Discount: <span className="font-semibold text-foreground">-${numericDiscount.toFixed(2)}</span></p>}
                <p className="text-xl font-bold text-foreground">Net Amount: ${netAmount.toFixed(2)}</p>
            </div>
          </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Create Sale</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

