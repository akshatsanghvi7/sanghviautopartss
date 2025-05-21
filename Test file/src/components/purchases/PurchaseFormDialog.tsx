
"use client";

import type { Part, PurchaseItem as PurchaseItemType, Supplier } from '@/lib/types';
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
import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, PlusCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const purchaseItemSchema = z.object({
  partNumber: z.string().min(1, "Part Number is required"),
  partName: z.string(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitCost: z.coerce.number().min(0, "Unit Cost must be zero or positive"),
});

const purchaseFormSchema = z.object({
  supplierId: z.string().optional(),
  supplierName: z.string().min(1, "Supplier Name is required"),
  supplierContactPerson: z.string().optional(),
  supplierEmail: z.string().email("Invalid email address").optional().or(z.literal('')),
  supplierPhone: z.string().optional(),
  supplierInvoiceNumber: z.string().optional(),
  purchaseDate: z.date({ required_error: "Purchase Date is required" }).optional().nullable(),
  paymentType: z.enum(['cash', 'bank_transfer', 'on_credit', 'cheque'], { required_error: "Payment Type is required" }),
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
  inventorySuppliers: Supplier[];
  initialData?: PurchaseFormData & { id?: string };
}

export function PurchaseFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  inventoryParts,
  inventorySuppliers,
  initialData,
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
    defaultValues: initialData || {
      purchaseDate: undefined,
      items: [],
      shippingCosts: 0,
      otherCharges: 0,
      paymentType: 'bank_transfer',
      status: 'Pending',
      supplierId: undefined,
      supplierName: '',
      supplierContactPerson: '',
      supplierEmail: '',
      supplierPhone: '',
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

  const [supplierSuggestions, setSupplierSuggestions] = useState<Supplier[]>([]);
  const [isSupplierPopoverOpen, setIsSupplierPopoverOpen] = useState(false);


  const resetFormState = useCallback(() => {
    reset(initialData || {
      purchaseDate: new Date(),
      items: [],
      shippingCosts: 0,
      otherCharges: 0,
      paymentType: 'bank_transfer',
      status: 'Pending',
      supplierId: undefined,
      supplierName: '',
      supplierContactPerson: '',
      supplierEmail: '',
      supplierPhone: '',
      supplierInvoiceNumber: '',
      notes: '',
    });
    setPartSearchTerm('');
    setCurrentQuantityInput(1);
    setCurrentUnitCostInput(0);
    setSelectedPartForAdding(null);
    setSupplierSuggestions([]);
    setIsSupplierPopoverOpen(false);
  }, [reset, initialData]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset(initialData);
      } else if (!getValues('purchaseDate')) {
        setValue('purchaseDate', new Date());
      }
    } else {
      resetFormState();
    }
  }, [isOpen, getValues, setValue, resetFormState, initialData, reset]);

  const handleSupplierNameChange = (name: string) => {
    setValue('supplierName', name, { shouldValidate: true }); 
    if (name.length > 0) {
      const filtered = inventorySuppliers.filter(s =>
        s.name.toLowerCase().includes(name.toLowerCase())
      );
      setSupplierSuggestions(filtered);
      setIsSupplierPopoverOpen(filtered.length > 0 && document.activeElement === document.getElementById('supplierNameInput'));
    } else {
      setSupplierSuggestions([]);
      setIsSupplierPopoverOpen(false);
      if (!initialData?.id) { 
          setValue("supplierId", undefined);
          setValue("supplierContactPerson", "");
          setValue("supplierEmail", "");
          setValue("supplierPhone", "");
      }
    }
  };

  const handleSupplierSelect = (supplier: Supplier) => {
    setValue("supplierId", supplier.id);
    setValue("supplierName", supplier.name); 
    setValue("supplierContactPerson", supplier.contactPerson || "");
    setValue("supplierEmail", supplier.email || "");
    setValue("supplierPhone", supplier.phone || "");
    setSupplierSuggestions([]);
    setIsSupplierPopoverOpen(false);
    const contactPersonInput = document.getElementById('supplierContactPerson');
    if (contactPersonInput) {
        contactPersonInput.focus();
    }
  };


  const handlePartSearch = (term: string) => {
    setPartSearchTerm(term);
    if (!term) {
        setSelectedPartForAdding(null); 
    }
  };

  const selectPartFromSearch = (part: Part) => {
    setSelectedPartForAdding(part);
    setPartSearchTerm(part.partName); 
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
      const existingItem = fields[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      setValue(`items.${existingItemIndex}.quantity`, newQuantity);
      setValue(`items.${existingItemIndex}.unitCost`, unitCost); 
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

    setPartSearchTerm(''); 
    setSelectedPartForAdding(null); 
    setCurrentQuantityInput(1);
    setCurrentUnitCostInput(0);
    document.getElementById('partSearch')?.focus(); 
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
    partSearchTerm && (
        part.partName.toLowerCase().includes(partSearchTerm.toLowerCase()) ||
        part.partNumber.toLowerCase().includes(partSearchTerm.toLowerCase())
    )
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
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) resetFormState();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Edit Purchase Order' : 'Create New Purchase Order'}</DialogTitle>
          <DialogDescription>
            {initialData?.id ? 'Update the details of this purchase order.' : 'Fill in the details for the new purchase order.'}
          </DialogDescription>
        </DialogHeader>
        <form id="purchaseFormId" onSubmit={handleSubmit(handleFormSubmitInternal)} className="flex-1 space-y-6 overflow-y-auto p-4 custom-scrollbar">
        
        <div className="space-y-4 p-4 border rounded-md">
            <h3 className="text-md font-medium">Supplier Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <Label htmlFor="supplierNameInput">Supplier Name *</Label>
                <Popover open={isSupplierPopoverOpen} onOpenChange={setIsSupplierPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Controller
                            name="supplierName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    id="supplierNameInput"
                                    {...field}
                                    onChange={(e) => {
                                        field.onChange(e);
                                        handleSupplierNameChange(e.target.value);
                                    }}
                                    onFocus={() => {
                                        const currentValue = getValues('supplierName');
                                        if(currentValue && currentValue.length > 0) {
                                            const filtered = inventorySuppliers.filter(s=>s.name.toLowerCase().includes(currentValue.toLowerCase()));
                                            if (filtered.length > 0) {
                                                setSupplierSuggestions(filtered);
                                                setIsSupplierPopoverOpen(true);
                                            }
                                        }
                                    }}
                                    autoComplete="off"
                                />
                            )}
                        />
                    </PopoverTrigger>
                    {supplierSuggestions.length > 0 && (
                        <PopoverContent
                            className="w-[--radix-popover-trigger-width] p-0"
                            align="start"
                            onOpenAutoFocus={(e) => e.preventDefault()} 
                        >
                            <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                {supplierSuggestions.map((s) => (
                                <div
                                    key={s.id}
                                    onClick={() => handleSupplierSelect(s)}
                                    className="p-2 hover:bg-accent cursor-pointer text-sm"
                                >
                                    {s.name}
                                </div>
                                ))}
                            </div>
                        </PopoverContent>
                    )}
                </Popover>
                {errors.supplierName && <p className="text-sm text-destructive">{errors.supplierName.message}</p>}
                </div>
                <div>
                <Label htmlFor="supplierContactPerson">Contact Person</Label>
                <Input id="supplierContactPerson" {...register("supplierContactPerson")} />
                </div>
                <div>
                <Label htmlFor="supplierEmail">Email</Label>
                <Input id="supplierEmail" type="email" {...register("supplierEmail")} />
                {errors.supplierEmail && <p className="text-sm text-destructive">{errors.supplierEmail.message}</p>}
                </div>
                <div>
                <Label htmlFor="supplierPhone">Phone</Label>
                <Input id="supplierPhone" type="tel" {...register("supplierPhone")} />
                </div>
            </div>
        </div>

        
        <div className="space-y-4 p-4 border rounded-md">
            <h3 className="text-md font-medium">Order Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select payment type" /></SelectTrigger>
                        <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="on_credit">On Credit</SelectItem>
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
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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
        </div>


        <div className="space-y-4 p-4 border rounded-md">
            <h3 className="text-md font-medium">Purchase Items</h3>
            {errors.items && !errors.items.message && typeof errors.items === 'object' && (
                <p className="text-sm text-destructive">Please add at least one item.</p>
            )}
            {errors.items?.message && <p className="text-sm text-destructive">{errors.items.message}</p>}
            
            <div className="space-y-3">
                <div>
                    <Label htmlFor="partSearch">Search Part (Name/Number)</Label>
                    <Input
                        id="partSearch"
                        value={partSearchTerm}
                        onChange={(e) => handlePartSearch(e.target.value)}
                        placeholder="Type to search part..."
                        autoComplete="off"
                    />
                </div>
            
                <div className="mt-1"> 
                    {partSearchTerm && (
                        filteredInventoryParts.length > 0 ? (
                            <div className="bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto custom-scrollbar">
                                {filteredInventoryParts.map(part => (
                                    <div
                                        key={part.partNumber}
                                        className="p-2 hover:bg-accent cursor-pointer text-sm"
                                        onClick={() => selectPartFromSearch(part)}
                                    >
                                        {part.partName} ({part.partNumber}) - Stock: {part.quantity}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            partSearchTerm.length > 0 && !selectedPartForAdding && ( 
                                <div className="mt-2 p-2 border border-dashed rounded-md text-sm text-muted-foreground">
                                    Part not found: "{partSearchTerm}". Please add new parts via the Inventory page.
                                </div>
                            )
                        )
                    )}
                </div>

                {selectedPartForAdding && (
                    <p className="text-sm text-muted-foreground mt-1">
                        Selected: {selectedPartForAdding.partName} (Current Stock: {selectedPartForAdding.quantity})
                    </p>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                        <Label htmlFor="currentQuantityInput">Quantity to Purchase *</Label>
                        <Input
                            id="currentQuantityInput" type="number" value={currentQuantityInput}
                            onChange={(e) => setCurrentQuantityInput(e.target.value ? Number(e.target.value) : '')} min="1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="currentUnitCostInput">Unit Cost (₹) *</Label>
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
                        <TableCell className="text-right">₹{item.unitCost.toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{(item.quantity * item.unitCost).toFixed(2)}</TableCell>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div>
                <Label htmlFor="shippingCosts">Shipping Costs (₹)</Label>
                <Input id="shippingCosts" type="number" {...register("shippingCosts")} placeholder="0.00" step="0.01" />
            </div>
            <div>
                <Label htmlFor="otherCharges">Other Charges (₹)</Label>
                <Input id="otherCharges" type="number" {...register("otherCharges")} placeholder="0.00" step="0.01" />
            </div>
            <div className="space-y-1 text-right md:col-start-3">
                <p className="text-muted-foreground">Subtotal: <span className="font-semibold text-foreground">₹{subTotal.toFixed(2)}</span></p>
                {numericShipping > 0 && <p className="text-muted-foreground">Shipping: <span className="font-semibold text-foreground">₹{numericShipping.toFixed(2)}</span></p>}
                {numericOtherCharges > 0 && <p className="text-muted-foreground">Other: <span className="font-semibold text-foreground">₹{numericOtherCharges.toFixed(2)}</span></p>}
                <p className="text-xl font-bold text-foreground">Net Amount: ₹{netAmount.toFixed(2)}</p>
            </div>
        </div>
        <div className="pt-4">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Any specific notes for this purchase order..." />
        </div>
        </form>
        <DialogFooter className="pt-4 border-t bg-background pb-4">
            <DialogClose asChild>
                <Button type="button" variant="outline" onClick={resetFormState}>Cancel</Button>
            </DialogClose>
            <Button type="submit" form="purchaseFormId">{initialData?.id ? 'Update Purchase Order' : 'Create Purchase Order'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
