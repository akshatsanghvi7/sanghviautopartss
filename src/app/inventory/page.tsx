
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Download, Upload, Search, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import React, { useState, useRef, useMemo } from 'react';
import type { Part } from '@/lib/types';
import { PartFormDialog, type PartFormData } from '@/components/inventory/PartFormDialog';
import { DeletePartDialog } from '@/components/inventory/DeletePartDialog';
import * as XLSX from 'xlsx';
import useLocalStorage from '@/hooks/useLocalStorage';

const initialMockParts: Part[] = [
  { partName: 'Spark Plug X100', otherName: 'Ignition Plug', partNumber: 'P001', company: 'Bosch', quantity: 150, category: 'Engine', mrp: '₹5.99', shelf: 'A1-01' },
  { partName: 'Oil Filter Z20', partNumber: 'P002', company: 'Mann-Filter', quantity: 80, category: 'Engine', mrp: '₹12.50', shelf: 'A1-02' },
  { partName: 'Brake Pad Set F5', otherName: 'Front Brakes', partNumber: 'P003', company: 'Brembo', quantity: 120, category: 'Brakes', mrp: '₹45.00', shelf: 'B2-05' },
  { partName: 'Headlight Bulb H4', partNumber: 'P004', company: 'Philips', quantity: 200, category: 'Lighting', mrp: '₹8.75', shelf: 'C3-10' },
  { partName: 'Air Filter A300', otherName: 'Engine Air Cleaner', partNumber: 'P005', company: 'K&N', quantity: 95, category: 'Filtration', mrp: '₹18.20', shelf: 'A1-03' },
];

// Expected Excel column order: Part Name, Other Name, Part Number, Company, Qty, Category, MRP, Shelf
const expectedColumns = ["Part Name", "Other Name", "Part Number", "Company", "Qty", "Category", "MRP", "Shelf"];


export default function InventoryPage() {
  const { toast } = useToast();
  const [mockParts, setMockParts] = useLocalStorage<Part[]>('autocentral-inventory-parts', initialMockParts);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPartFormDialogOpen, setIsPartFormDialogOpen] = useState(false);
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
  const [partToEdit, setPartToEdit] = useState<Part | null>(null);
  const [partToDelete, setPartToDelete] = useState<Part | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');


  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file (.xlsx, .xls) to import.",
        variant: "destructive",
      });
      return;
    }

    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: "Please select an Excel file (.xlsx or .xls).",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result;
      if (!arrayBuffer) {
        toast({
          title: "Error reading file",
          description: "Could not read the file content.",
          variant: "destructive",
        });
        return;
      }

      try {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 1) {
            toast({
                title: "Empty or invalid file",
                description: "The Excel file is empty or does not contain valid data rows.",
                variant: "destructive",
            });
            return;
        }
        
        const headerRow = jsonData[0].map(String); 
        let startIndex = 0;
        const isHeaderPresent = expectedColumns.every((col, index) => headerRow[index]?.trim().toLowerCase() === col.trim().toLowerCase());

        if (isHeaderPresent) {
            startIndex = 1;
        }
        
        if (jsonData.length <= startIndex) {
             toast({
                title: "No data rows found",
                description: "The Excel file only contains a header or is empty.",
                variant: "destructive",
            });
            return;
        }

        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        setMockParts(prevParts => {
          const newPartsList = [...prevParts];
          
          for (let i = startIndex; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length < expectedColumns.length) {
              console.warn(`Skipping malformed row ${i + 1}: Expected ${expectedColumns.length} columns, got ${row?.length || 0}. Row data: ${row}`);
              skippedCount++;
              continue;
            }
            const [
              partNameVal, otherNameVal, partNumberVal, companyVal,
              quantityStrVal, categoryVal, mrpVal, shelfVal
            ] = row.map(cell => cell !== null && cell !== undefined ? String(cell).trim() : '');

            const quantity = parseInt(quantityStrVal, 10);

            if (isNaN(quantity)) {
              console.warn(`Skipping row ${i + 1} due to invalid quantity: ${quantityStrVal}`);
              skippedCount++;
              continue;
            }
            if (!partNumberVal || !partNameVal) {
              console.warn(`Skipping row ${i + 1} due to missing Part Number or Part Name (Part Number: ${partNumberVal}, Part Name: ${partNameVal}).`);
              skippedCount++;
              continue;
            }
            
            const mrpString = typeof mrpVal === 'number' ? `₹${mrpVal.toFixed(2)}` : (String(mrpVal).startsWith('₹') ? String(mrpVal) : `₹${String(mrpVal)}`);

            const existingPartIndex = newPartsList.findIndex(p => p.partNumber === partNumberVal);

            if (existingPartIndex !== -1) {
              // Part exists, update it
              const existingPart = newPartsList[existingPartIndex];
              existingPart.partName = partNameVal;
              existingPart.otherName = otherNameVal || undefined;
              existingPart.company = companyVal || undefined;
              existingPart.quantity += quantity; // Add to existing quantity
              existingPart.category = categoryVal;
              existingPart.mrp = mrpString;
              existingPart.shelf = shelfVal || undefined;
              updatedCount++;
            } else {
              // Part does not exist, add new
              newPartsList.push({
                partName: partNameVal,
                otherName: otherNameVal || undefined,
                partNumber: partNumberVal,
                company: companyVal || undefined,
                quantity,
                category: categoryVal,
                mrp: mrpString,
                shelf: shelfVal || undefined,
              });
              addedCount++;
            }
          }
          return newPartsList;
        });
        
        if (addedCount === 0 && updatedCount === 0 && jsonData.length > startIndex) {
             toast({
                title: "No valid parts processed",
                description: `The Excel file might be empty, incorrectly formatted, or all parts caused issues. Expected columns: ${expectedColumns.join(', ')}.`,
                variant: "destructive",
                duration: 9000,
            });
        } else {
            toast({
              title: "Import Complete",
              description: `${addedCount} new parts added. ${updatedCount} parts updated. ${skippedCount} rows skipped.`,
              duration: 7000,
            });
        }

      } catch (error) {
        console.error("Error parsing Excel file:", error);
        toast({
          title: "Import Failed",
          description: `There was an error parsing the Excel file. Please ensure it's correctly formatted and columns are in order: ${expectedColumns.join(', ')}. All ${expectedColumns.length} columns must be present.`,
          variant: "destructive",
          duration: 9000,
        });
      } finally {
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; 
        }
      }
    };
    reader.onerror = () => {
        toast({
          title: "File Read Error",
          description: "Could not read the selected file.",
          variant: "destructive",
        });
         if (fileInputRef.current) {
            fileInputRef.current.value = ""; 
        }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportToExcel = () => {
    if (mockParts.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no parts in the inventory to export.",
        variant: "destructive"
      });
      return;
    }
    
    const dataToExport = [
      expectedColumns,
      ...mockParts.map(part => [
        part.partName || '',
        part.otherName || '',
        part.partNumber || '',
        part.company || '',
        part.quantity,
        part.category || '',
        part.mrp || '',
        part.shelf || '',
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    
    try {
      XLSX.writeFile(workbook, "inventory.xlsx");
      toast({
        title: "Export Successful",
        description: "Inventory data has been exported to inventory.xlsx.",
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting the data to Excel.",
        variant: "destructive"
      });
    }
  };

const handlePartFormSubmit = (data: PartFormData, originalPartNumber?: string) => {
    setMockParts(prevParts => {
        const newPartsList = [...prevParts];
        const existingPartIndex = newPartsList.findIndex(p => p.partNumber === (originalPartNumber || data.partNumber));

        if (formMode === 'edit' && originalPartNumber) { // Editing existing part
            if (existingPartIndex !== -1) {
                newPartsList[existingPartIndex] = {
                    ...newPartsList[existingPartIndex], // keep original partNumber if it was disabled in form
                    ...data,
                    partNumber: originalPartNumber, // Ensure part number isn't changed by edit
                };
                toast({ title: "Part Updated", description: `${data.partName} has been updated.` });
            }
        } else { // Adding new part or updating based on part number if it exists
            if (existingPartIndex !== -1) { // Part with this number already exists
                const existingPart = newPartsList[existingPartIndex];
                existingPart.partName = data.partName;
                existingPart.otherName = data.otherName;
                existingPart.company = data.company;
                existingPart.quantity = data.quantity; // Replace quantity
                existingPart.category = data.category;
                existingPart.mrp = data.mrp.startsWith('₹') ? data.mrp : `₹${data.mrp}`;
                existingPart.shelf = data.shelf;
                toast({ title: "Part Updated", description: `Details for ${data.partNumber} have been updated.` });
            } else { // New part number
                newPartsList.push({
                    ...data,
                    mrp: data.mrp.startsWith('₹') ? data.mrp : `₹${data.mrp}`,
                });
                toast({ title: "Part Added", description: `${data.partName} has been added.` });
            }
        }
        return newPartsList;
    });
    setIsPartFormDialogOpen(false);
    setPartToEdit(null);
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

  const confirmDeletePart = () => {
    if (partToDelete) {
      setMockParts(prevParts => prevParts.filter(p => p.partNumber !== partToDelete.partNumber));
      toast({
        title: "Part Deleted",
        description: `${partToDelete.partName} has been deleted.`,
        variant: "destructive",
      });
      setPartToDelete(null);
    }
    setIsDeleteConfirmDialogOpen(false);
  };
  
  const filteredParts = mockParts.filter(part =>
    (part.partName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (part.partNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (part.otherName && part.otherName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (part.company && part.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (part.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );


  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx, .xls"
          style={{ display: 'none' }}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventory Management</h1>
            <p className="text-muted-foreground">Manage your automotive parts stock efficiently.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleImportClick}>
              <Upload className="mr-2 h-4 w-4" /> Import Excel
            </Button>
            <Button variant="outline" onClick={handleExportToExcel}>
              <Download className="mr-2 h-4 w-4" /> Export Excel
            </Button>
            <Button onClick={openAddPartDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Part
            </Button>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Parts List</CardTitle>
            <CardDescription>
              Browse, search, and manage your inventory parts. For Excel import, use columns in this order: 
              {expectedColumns.join(', ')}. 
              The first row can optionally be headers. All {expectedColumns.length} columns must be present for data rows, even if optional fields are empty.
              If importing a part with an existing Part Number, its details (including MRP) will be updated and quantity will be added. New Part Numbers will be added.
            </CardDescription>
             <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, number, company, category..." 
                className="pl-10 w-full sm:w-1/2 lg:w-1/3" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Other Name</TableHead>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">MRP</TableHead>
                  <TableHead>Shelf</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((part, index) => ( // Added index for a more unique key if needed
                  <TableRow key={`${part.partNumber}-${index}`}> 
                    <TableCell className="font-medium">{part.partName}</TableCell>
                    <TableCell>{part.otherName || '-'}</TableCell>
                    <TableCell>{part.partNumber}</TableCell>
                    <TableCell>{part.company || '-'}</TableCell>
                    <TableCell className="text-right">{part.quantity}</TableCell>
                    <TableCell>{part.category}</TableCell>
                    <TableCell className="text-right">{part.mrp}</TableCell>
                    <TableCell>{part.shelf || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => openEditPartDialog(part)}>
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => openDeleteConfirmDialog(part)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredParts.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    {mockParts.length > 0 && searchTerm ? 'No parts match your search.' : 'No parts found. Add new parts or import from an Excel file to get started.'}
                </div>
            )}
          </CardContent>
        </Card>
      </div>
      <PartFormDialog
        isOpen={isPartFormDialogOpen}
        onOpenChange={setIsPartFormDialogOpen}
        onSubmit={handlePartFormSubmit}
        initialData={partToEdit}
        dialogTitle={formMode === 'add' ? 'Add New Part' : 'Edit Part'}
        formMode={formMode}
        existingPartNumbers={mockParts.map(p => p.partNumber)}
      />
      {partToEdit && formMode === 'edit' && ( // Conditionally render edit dialog only when partToEdit is set for editing
        <PartFormDialog
          isOpen={isPartFormDialogOpen && formMode === 'edit'}
          onOpenChange={setIsPartFormDialogOpen}
          onSubmit={handlePartFormSubmit}
          initialData={partToEdit}
          dialogTitle="Edit Part"
          formMode="edit"
          existingPartNumbers={mockParts.map(p => p.partNumber).filter(pn => pn !== partToEdit.partNumber)}
        />
      )}
      {partToDelete && (
         <DeletePartDialog
            isOpen={isDeleteConfirmDialogOpen}
            onOpenChange={setIsDeleteConfirmDialogOpen}
            onConfirm={confirmDeletePart}
            partName={partToDelete.partName}
          />
      )}
    </AppLayout>
  );
}
