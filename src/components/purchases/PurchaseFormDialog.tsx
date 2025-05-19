
"use client";

import type { Part, PurchaseItem as PurchaseItemType } from '@/lib/types'; // Renamed to avoid conflict
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
import { Textarea } from "@/components/ui/textarea";
import { useForm, useFieldArray, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, PlusCircle } from 'lucide-react';

const purchaseItemSchema = z.object({
  partNumber: z.string().min(1, "Part Number is required"),
  partName: z.string(), // Will be populated based on partNumber
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitCost: z.coerce.number().min(0, "Unit Cost must be zero or positive"),
});

const purchaseFormSchema = z.object({
  supplierName: z.string().min(1, "Supplier Name is required"),
  supplierInvoiceNumber: z.string().optional(),
  purchaseDate: z.date({ required_error: "Purchase Date is required" }).optional().nullable(),
  paymentType: z.enum(['cash', 'bank_transfer', 'credit_card', 'cheque'], { required_error: "Payment Type is required" }),
  status: z.enum(['Pending', 'Ordered', 'Partially Received', 'Received', 'Cancelled'], { required_error: "Status is required" }),
  items: z.array(purchaseItemSchema).min(1, "At least one item must be added to the purchase order"),
  shippingCosts: z.coerce.number().min(0, "Shipping Costs cannot be negative").optional(),
  otherCharges: z.coerce.number().min(0, "Other Charges cannot be negative").optional(),
  notes: z.string().optional(),
});

export type PurchaseFormData = z.infer<typeof purchaseFormSchema>;

interface PurchaseFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PurchaseFormData) => void;
  inventoryParts: Part[];
}

export function PurchaseFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  inventoryParts,
}: PurchaseFormDialogProps) {
  const { toast } = useToast();
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      purchaseDate: undefined,
      items: [],
      shippingCosts: 0,
      otherCharges: 0,
      paymentType: 'bank_transfer',
      status: 'Pending',
      supplierName: '',
      supplierInvoiceNumber: '',
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const [partSearchTerm, setPartSearchTerm] = useState('');
  const [currentQuantityInput, setCurrentQuantityInput] = useState<number | string>(1);
  const [currentUnitCostInput, setCurrentUnitCostInput] = useState<number | string>(0);
  const [selectedPartForAdding, setSelectedPartForAdding] = useState<Part | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (!getValues('purchaseDate')) {
        setValue('purchaseDate', new Date());
      }
    } else {
      reset({
        purchaseDate: undefined,
        items: [],
        shippingCosts: 0,
        otherCharges: 0,
        paymentType: 'bank_transfer',
        status: 'Pending',
        supplierName: '',
        supplierInvoiceNumber: '',
        notes: '',
      });
      setPartSearchTerm('');
      setCurrentQuantityInput(1);
      setCurrentUnitCostInput(0);
      setSelectedPartForAdding(null);
    }
  }, [isOpen, reset, setValue, getValues]);

  const handlePartSearch = (term: string) => {
    setPartSearchTerm(term);
    if (!term) {
        setSelectedPartForAdding(null);
        return;
    }
    const part = inventoryParts.find(p => 
        p.partNumber.toLowerCase().includes(term.toLowerCase()) ||
        p.partName.toLowerCase().includes(term.toLowerCase())
    );
    setSelectedPartForAdding(part || null);
    if (!part && term.length > 2) { // Avoid toast for every char if part not found immediately
        // toast({ title: "Part not found", description: `No part matching "${term}" in inventory.`, variant: "destructive"});
    }
  };
  
  const selectPartFromSearch = (part: Part) => {
    setSelectedPartForAdding(part);
    setPartSearchTerm(part.partName); // Populate search box with part name
    // Optionally set unit cost if we want to prefill from part.costPrice
    // setCurrentUnitCostInput(part.costPrice || 0); 
  }

  const handleAddItem = () => {
    if (!selectedPartForAdding) {
      toast({ title: "No Part Selected", description: "Please search and select a valid part.", variant: "destructive" });
      return;
    }
    const quantity = Number(currentQuantityInput);
    const unitCost = Number(currentUnitCostInput);

    if (isNaN(quantity) || quantity <= 0) {
      toast({ title: "Invalid Quantity", description: "Please enter a valid quantity greater than 0.", variant: "destructive" });
      return;
    }
    if (isNaN(unitCost) || unitCost < 0) {
      toast({ title: "Invalid Unit Cost", description: "Please enter a valid unit cost (zero or positive).", variant: "destructive" });
      return;
    }

    const existingItemIndex = fields.findIndex(item => item.partNumber === selectedPartForAdding.partNumber);

    if (existingItemIndex > -1) {
      // Update quantity of existing item
      const existingItem = fields[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      // If cost is different, average it or take latest? For now, let's assume user wants to update cost for this batch.
      setValue(`items.${existingItemIndex}.quantity`, newQuantity);
      setValue(`items.${existingItemIndex}.unitCost`, unitCost); // Or average cost logic
      toast({ title: "Item Updated", description: `Quantity for ${selectedPartForAdding.partName} updated.` });
    } else {
      append({
        partNumber: selectedPartForAdding.partNumber,
        partName: selectedPartForAdding.partName,
        quantity: quantity,
        unitCost: unitCost,
      });
      toast({ title: "Item Added", description: `${quantity} x ${selectedPartForAdding.partName} added to PO.` });
    }
    
    // Reset inputs for next item
    setPartSearchTerm(''); 
    setSelectedPartForAdding(null);
    setCurrentQuantityInput(1);
    setCurrentUnitCostInput(0);
  };

  const watchedItems = watch("items");
  const subTotal = watchedItems.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);
  
  const watchedShipping = watch("shippingCosts");
  const watchedOtherCharges = watch("otherCharges");

  const parseNumericValue = (value: string | number | undefined): number => {
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const numericShipping = parseNumericValue(watchedShipping);
  const numericOtherCharges = parseNumericValue(watchedOtherCharges);
  const netAmount = subTotal + numericShipping + numericOtherCharges;

  const filteredInventoryParts = inventoryParts.filter(part =>
    part.partName.toLowerCase().includes(partSearchTerm.toLowerCase()) ||
    part.partNumber.toLowerCase().includes(partSearchTerm.toLowerCase())
  ).slice(0, 5);

  const handleFormSubmitInternal: SubmitHandler<PurchaseFormData> = (data) => {
     if (!data.purchaseDate) {
      toast({ title: "Purchase Date Missing", description: "Please select a purchase date.", variant: "destructive" });
      return;
    }
    const submissionData = {
      ...data,
      shippingCosts: numericShipping,
      otherCharges: numericOtherCharges,
    };
    onSubmit(submissionData as PurchaseFormData & { purchaseDate: Date });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New Purchase Order</DialogTitle>
          <DialogDescription>Fill in the details for the new purchase order.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmitInternal)} className="space-y-4">
        <ScrollArea className="h-[65vh] pr-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="supplierName">Supplier Name *</Label>
              <Input id="supplierName" {...register("supplierName")} />
              {errors.supplierName && <p className="text-sm text-destructive">{errors.supplierName.message}</p>}
            </div>
            <div>
              <Label htmlFor="supplierInvoiceNumber">Supplier Invoice No.</Label>
              <Input id="supplierInvoiceNumber" {...register("supplierInvoiceNumber")} />
            </div>
            <div>
              <Label htmlFor="purchaseDate">Purchase Date *</Label>
              <Controller
                name="purchaseDate"
                control={control}
                render={({ field }) => (
                    <DatePicker
                        date={field.value || undefined}
                        setDate={(date) => field.onChange(date)}
                    />
                )}
              />
              {errors.purchaseDate && <p className="text-sm text-destructive">{errors.purchaseDate.message}</p>}
            </div>
            <div>
              <Label htmlFor="paymentType">Payment Type *</Label>
               <Controller
                name="paymentType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select payment type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paymentType && <p className="text-sm text-destructive">{errors.paymentType.message}</p>}
            </div>
            <div>
                <Label htmlFor="status">Status *</Label>
                <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Ordered">Ordered</SelectItem>
                        <SelectItem value="Partially Received">Partially Received</SelectItem>
                        <SelectItem value="Received">Received</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                    )}
                />
                {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
            </div>
          </div>

          <h3 className="text-lg font-medium border-t pt-4">Purchase Items</h3>
          {errors.items && !errors.items.message && typeof errors.items === 'object' && (
            <p className="text-sm text-destructive">Please add at least one item.</p>
          )}
          {errors.items?.message && <p className="text-sm text-destructive">{errors.items.message}</p>}

          <div className="space-y-3 border p-4 rounded-md">
            <div className="relative">
                <Label htmlFor="partSearch">Search Part (Name/Number)</Label>
                <Input
                    id="partSearch"
                    value={partSearchTerm}
                    onChange={(e) => handlePartSearch(e.target.value)}
                    placeholder="Type to search part..."
                />
                {partSearchTerm && filteredInventoryParts.length > 0 && (
                    <div className="absolute z-10 w-full bg-background border mt-1 rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredInventoryParts.map(part => (
                            <div
                                key={part.partNumber}
                                className="p-2 hover:bg-accent cursor-pointer"
                                onClick={() => selectPartFromSearch(part)}
                            >
                                {part.partName} ({part.partNumber}) - Stock: {part.quantity}
                            </div>
                        ))}
                    </div>
                )}
            </div>
             {selectedPartForAdding && (
                 <p className="text-sm text-muted-foreground">
                    Selected: {selectedPartForAdding.partName} (Current Stock: {selectedPartForAdding.quantity})
                 </p>
              )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="currentQuantityInput">Quantity to Purchase *</Label>
                    <Input
                        id="currentQuantityInput" type="number" value={currentQuantityInput}
                        onChange={(e) => setCurrentQuantityInput(e.target.value ? Number(e.target.value) : '')} min="1"
                    />
                </div>
                <div>
                    <Label htmlFor="currentUnitCostInput">Unit Cost *</Label>
                    <Input
                        id="currentUnitCostInput" type="number" value={currentUnitCostInput}
                        onChange={(e) => setCurrentUnitCostInput(e.target.value ? Number(e.target.value) : '')} min="0" step="0.01"
                    />
                </div>
            </div>
            <Button type="button" onClick={handleAddItem} className="w-full sm:w-auto" disabled={!selectedPartForAdding}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item to PO
            </Button>
          </div>

          {fields.length > 0 && (
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Part No.</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
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
                      <TableCell className="text-right">${item.unitCost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${(item.quantity * item.unitCost).toFixed(2)}</TableCell>
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
            <div>
              <Label htmlFor="shippingCosts">Shipping Costs</Label>
              <Input id="shippingCosts" type="number" {...register("shippingCosts")} placeholder="0.00" step="0.01" />
            </div>
            <div>
              <Label htmlFor="otherCharges">Other Charges</Label>
              <Input id="otherCharges" type="number" {...register("otherCharges")} placeholder="0.00" step="0.01" />
            </div>
             <div className="space-y-1 text-right md:col-start-3">
                <p className="text-muted-foreground">Subtotal: <span className="font-semibold text-foreground">${subTotal.toFixed(2)}</span></p>
                {numericShipping > 0 && <p className="text-muted-foreground">Shipping: <span className="font-semibold text-foreground">${numericShipping.toFixed(2)}</span></p>}
                {numericOtherCharges > 0 && <p className="text-muted-foreground">Other: <span className="font-semibold text-foreground">${numericOtherCharges.toFixed(2)}</span></p>}
                <p className="text-xl font-bold text-foreground">Net Amount: ${netAmount.toFixed(2)}</p>
            </div>
          </div>
           <div className="mt-4 border-t pt-4">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" {...register("notes")} placeholder="Any specific notes for this purchase order..." />
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Create Purchase Order</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
