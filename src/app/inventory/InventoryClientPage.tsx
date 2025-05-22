
"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Download, Upload, Search, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useRef, useMemo, useEffect, startTransition } from 'react';
import type { Part } from '@/lib/types';
import { PartFormDialog, type PartFormData } from '@/components/inventory/PartFormDialog';
import { DeletePartDialog } from '@/components/inventory/DeletePartDialog';
import * as XLSX from 'xlsx';
import { addOrUpdatePart, importParts, deletePartAction } from './actions';

const expectedColumns = ["Part Name", "Other Name", "Part Number", "Company", "Qty", "Category", "MRP", "Shelf"];
const ALL_CATEGORIES_VALUE = "__ALL_CATEGORIES__";

interface InventoryClientPageProps {
  initialParts: Part[];
}

export function InventoryClientPage({ initialParts }: InventoryClientPageProps) {
  const { toast } = useToast();
  const [parts, setParts] = useState<Part[]>(initialParts);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPartFormDialogOpen, setIsPartFormDialogOpen] = useState(false);
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
  const [partToEdit, setPartToEdit] = useState<Part | null>(null);
  const [partToDelete, setPartToDelete] = useState<Part | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

  // Update client-side parts when initialParts prop changes (e.g., after revalidation)
  useEffect(() => {
    setParts(initialParts);
  }, [initialParts]);


  const formatMrp = (mrpString: string | number): string => {
    if (typeof mrpString === 'number') {
      return `₹${mrpString.toFixed(2)}`;
    }
    const numericValue = parseFloat(String(mrpString).replace(/[^0-9₹.-]+/g,""));
    if (isNaN(numericValue)) return '₹0.00';
    return `₹${numericValue.toFixed(2)}`;
  };

  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    parts.forEach(part => {
      if (part.category) {
        categories.add(part.category);
      }
    });
    return Array.from(categories).sort();
  }, [parts]);

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ title: "No file selected", description: "Please select an Excel file.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result;
      if (!arrayBuffer) {
        toast({ title: "Error reading file", variant: "destructive" });
        return;
      }
      try {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 1) {
            toast({ title: "Empty file", variant: "destructive" });
            return;
        }
        
        const headerRow = jsonData[0].map(String); 
        let startIndex = 0;
        const isHeaderPresent = expectedColumns.every((col, index) => headerRow[index]?.trim().toLowerCase() === col.trim().toLowerCase());

        if (isHeaderPresent) startIndex = 1;
        if (jsonData.length <= startIndex) {
             toast({ title: "No data rows found", variant: "destructive" });
            return;
        }

        const partsToImport: Part[] = [];
        let skippedCount = 0;

        for (let i = startIndex; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < expectedColumns.length) {
            skippedCount++;
            continue;
          }
          const [partNameVal, otherNameVal, partNumberVal, companyVal, quantityStrVal, categoryVal, mrpValExcel, shelfVal] = row.map(cell => cell !== null && cell !== undefined ? String(cell).trim() : '');
          const quantity = parseInt(quantityStrVal, 10);
          const formattedMrpFromExcel = formatMrp(mrpValExcel);

          if (isNaN(quantity) || !partNumberVal || !partNameVal || !mrpValExcel) {
            skippedCount++;
            continue;
          }
          partsToImport.push({
            partName: partNameVal,
            otherName: otherNameVal || undefined,
            partNumber: partNumberVal,
            company: companyVal || undefined,
            quantity,
            category: categoryVal,
            mrp: formattedMrpFromExcel,
            shelf: shelfVal || undefined,
          });
        }
        
        if (partsToImport.length === 0 && skippedCount > 0) {
            toast({ title: "No valid parts found in file", description: `All ${skippedCount} data rows were skipped. Ensure format and all ${expectedColumns.length} columns are present.`, variant: "destructive", duration: 9000});
            return;
        }
        
        startTransition(async () => {
          const result = await importParts(partsToImport);
          if (result.success) {
            toast({ title: "Import Complete", description: `${result.addedCount} added, ${result.updatedCount} updated. ${skippedCount} rows skipped.` });
          } else {
            toast({ title: "Import Failed", description: result.message, variant: "destructive" });
          }
        });

      } catch (error) {
        console.error("Error parsing Excel file:", error);
        toast({ title: "Import Failed", description: `Error parsing Excel file. Columns: ${expectedColumns.join(', ')}.`, variant: "destructive", duration: 9000 });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ""; 
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportToExcel = () => {
    if (parts.length === 0) {
      toast({ title: "No Data to Export", variant: "destructive" });
      return;
    }
    const dataToExport = [expectedColumns, ...parts.map(part => [part.partName || '', part.otherName || '', part.partNumber || '', part.company || '', part.quantity, part.category || '', part.mrp || '', part.shelf || ''])];
    const worksheet = XLSX.utils.aoa_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    try {
      XLSX.writeFile(workbook, "inventory.xlsx");
      toast({ title: "Export Successful" });
    } catch (error) {
      toast({ title: "Export Failed", variant: "destructive" });
    }
  };

  const handlePartFormSubmit = async (data: PartFormData, originalPart?: Part) => {
    const partToSubmit: Part = {
      ...data,
      mrp: formatMrp(data.mrp), // Ensure MRP is formatted correctly before sending
    };

    startTransition(async () => {
      const result = await addOrUpdatePart(partToSubmit);
      if (result.success) {
        toast({ title: result.message });
        setIsPartFormDialogOpen(false);
        setPartToEdit(null);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  const openAddPartDialog = () => {
    setFormMode('add');
    setPartToEdit(null);
    setIsPartFormDialogOpen(true);
  };

  const openEditPartDialog = (part: Part) => {
    setFormMode('edit');
    setPartToEdit(part);
    setIsPartFormDialogOpen(true);
  };

  const openDeleteConfirmDialog = (part: Part) => {
    setPartToDelete(part);
    setIsDeleteConfirmDialogOpen(true);
  };

  const confirmDeletePart = async () => {
    if (partToDelete) {
      startTransition(async () => {
        const result = await deletePartAction({ partNumber: partToDelete.partNumber, mrp: partToDelete.mrp });
        if (result.success) {
          toast({ title: "Part Deleted", description: `${partToDelete.partName} (MRP: ${partToDelete.mrp}) deleted.`, variant: "destructive" });
          setPartToDelete(null);
        } else {
          toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        setIsDeleteConfirmDialogOpen(false);
      });
    }
  };
  
  const filteredParts = useMemo(() => {
    return parts.filter(part => {
      const searchTermMatch = 
        (part.partName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (part.partNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (part.otherName && part.otherName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (part.company && part.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (part.mrp?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const categoryMatch = selectedCategory ? (part.category?.toLowerCase() === selectedCategory.toLowerCase()) : true;
      return searchTermMatch && categoryMatch;
    }).sort((a, b) => {
      if (a.partNumber < b.partNumber) return -1;
      if (a.partNumber > b.partNumber) return 1;
      const mrpA = parseFloat(a.mrp.replace('₹', ''));
      const mrpB = parseFloat(b.mrp.replace('₹', ''));
      if (mrpA < mrpB) return -1;
      if (mrpA > mrpB) return 1;
      return 0;
    });
  }, [parts, searchTerm, selectedCategory]);

  return (
    <div className="flex flex-col gap-6">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" style={{ display: 'none' }} />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">Manage parts stock. Parts with same Part Number but different MRPs are separate entries.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleImportClick}><Upload className="mr-2 h-4 w-4" /> Import Excel</Button>
          <Button variant="outline" onClick={handleExportToExcel}><Download className="mr-2 h-4 w-4" /> Export Excel</Button>
          <Button onClick={openAddPartDialog}><PlusCircle className="mr-2 h-4 w-4" /> Add Part</Button>
        </div>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Parts List</CardTitle>
          <CardDescription>
            Import using Excel columns: {expectedColumns.join(', ')}.
            Existing Part Number + MRP combination will update quantity & details. New combinations create new entries.
          </CardDescription>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 items-center">
            <div className="relative flex-grow w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-10 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={selectedCategory === "" ? ALL_CATEGORIES_VALUE : selectedCategory} onValueChange={(value) => setSelectedCategory(value === ALL_CATEGORIES_VALUE ? "" : value)}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES_VALUE}>All Categories</SelectItem>
                {uniqueCategories.map(category => (<SelectItem key={category} value={category}>{category}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part Name</TableHead><TableHead>Other Name</TableHead><TableHead>Part Number</TableHead>
                <TableHead>Company</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Category</TableHead>
                <TableHead className="text-right">MRP</TableHead><TableHead>Shelf</TableHead><TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParts.map((part, index) => (
                <TableRow key={`${part.partNumber}-${part.mrp}-${index}`}>
                  <TableCell className="font-medium">{part.partName}</TableCell><TableCell>{part.otherName || '-'}</TableCell>
                  <TableCell>{part.partNumber}</TableCell><TableCell>{part.company || '-'}</TableCell>
                  <TableCell className="text-right">{part.quantity}</TableCell><TableCell>{part.category}</TableCell>
                  <TableCell className="text-right">{part.mrp}</TableCell><TableCell>{part.shelf || '-'}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => openEditPartDialog(part)}><Edit2 className="h-4 w-4" /><span className="sr-only">Edit</span></Button>
                    <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => openDeleteConfirmDialog(part)}><Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredParts.length === 0 && (<div className="text-center py-10 text-muted-foreground">{parts.length > 0 && (searchTerm || selectedCategory) ? 'No parts match criteria.' : 'No parts found.'}</div>)}
        </CardContent>
      </Card>
      <PartFormDialog isOpen={isPartFormDialogOpen} onOpenChange={setIsPartFormDialogOpen} onSubmit={handlePartFormSubmit} initialData={partToEdit} dialogTitle={formMode === 'add' ? 'Add/Update Part Entry' : 'Edit Part Entry'} formMode={formMode} />
      {partToDelete && (<DeletePartDialog isOpen={isDeleteConfirmDialogOpen} onOpenChange={setIsDeleteConfirmDialogOpen} onConfirm={confirmDeletePart} partName={`${partToDelete.partName} (MRP: ${partToDelete.mrp})`} />)}
    </div>
  );
}
