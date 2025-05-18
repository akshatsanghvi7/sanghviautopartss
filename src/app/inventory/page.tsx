
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Download, Upload, Search, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import React, { useState, useRef } from 'react';
import type { Part } from '@/lib/types';
import { PartFormDialog, type PartFormData } from '@/components/inventory/PartFormDialog';
import { DeletePartDialog } from '@/components/inventory/DeletePartDialog';
import * as XLSX from 'xlsx';
import useLocalStorage from '@/hooks/useLocalStorage';

const initialMockParts: Part[] = [
  { partName: 'Spark Plug X100', otherName: 'Ignition Plug', partNumber: 'P001', company: 'Bosch', quantity: 150, category: 'Engine', mrp: '$5.99', shelf: 'A1-01' },
  { partName: 'Oil Filter Z20', partNumber: 'P002', company: 'Mann-Filter', quantity: 80, category: 'Engine', mrp: '$12.50', shelf: 'A1-02' },
  { partName: 'Brake Pad Set F5', otherName: 'Front Brakes', partNumber: 'P003', company: 'Brembo', quantity: 120, category: 'Brakes', mrp: '$45.00', shelf: 'B2-05' },
  { partName: 'Headlight Bulb H4', partNumber: 'P004', company: 'Philips', quantity: 200, category: 'Lighting', mrp: '$8.75', shelf: 'C3-10' },
  { partName: 'Air Filter A300', otherName: 'Engine Air Cleaner', partNumber: 'P005', company: 'K&N', quantity: 95, category: 'Filtration', mrp: '$18.20', shelf: 'A1-03' },
];

// Expected Excel column order: Part Name, Other Name, Part Number, Company, Qty, Category, MRP, Shelf
const expectedColumns = ["Part Name", "Other Name", "Part Number", "Company", "Qty", "Category", "MRP", "Shelf"];


export default function InventoryPage() {
  const { toast } = useToast();
  const [mockParts, setMockParts] = useLocalStorage<Part[]>('autocentral-inventory-parts', initialMockParts);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAddPartDialogOpen, setIsAddPartDialogOpen] = useState(false);
  const [isEditPartDialogOpen, setIsEditPartDialogOpen] = useState(false);
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
  const [partToEdit, setPartToEdit] = useState<Part | null>(null);
  const [partToDelete, setPartToDelete] = useState<Part | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

        if (jsonData.length < 1) { // No data or only header
            toast({
                title: "Empty or invalid file",
                description: "The Excel file is empty or does not contain valid data rows.",
                variant: "destructive",
            });
            return;
        }
        
        const headerRow = jsonData[0].map(String); // Convert all header cells to string
        let startIndex = 0;
        // Basic header check: if the first row looks like our expected headers, skip it
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


        const importedParts: Part[] = [];
        for (let i = startIndex; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < expectedColumns.length) {
            console.warn(`Skipping malformed row ${i + 1}: Expected ${expectedColumns.length} columns, got ${row?.length || 0}. Row data: ${row}`);
            continue;
          }
          // Expected order: Part Name, Other Name, Part Number, Company, Qty, Category, MRP, Shelf
          const [
            partNameVal,      // values[0]
            otherNameVal,     // values[1]
            partNumberVal,    // values[2]
            companyVal,       // values[3]
            quantityStrVal,   // values[4]
            categoryVal,      // values[5]
            mrpVal,           // values[6]
            shelfVal          // values[7]
          ] = row.map(cell => cell !== null && cell !== undefined ? String(cell).trim() : '');


          const quantity = parseInt(quantityStrVal, 10);

          if (isNaN(quantity)) {
            console.warn(`Skipping row ${i + 1} due to invalid quantity: ${quantityStrVal}`);
            continue;
          }

          if (!partNumberVal || !partNameVal) {
            console.warn(`Skipping row ${i + 1} due to missing Part Number or Part Name (Part Number: ${partNumberVal}, Part Name: ${partNameVal}).`);
            continue;
          }

          importedParts.push({
            partName: partNameVal,
            otherName: otherNameVal || undefined,
            partNumber: partNumberVal,
            company: companyVal || undefined,
            quantity,
            category: categoryVal,
            mrp: typeof mrpVal === 'number' ? `$${mrpVal.toFixed(2)}` : (mrpVal.startsWith('$') || mrpVal.startsWith('₹') ? mrpVal : `$${mrpVal}`),
            shelf: shelfVal || undefined,
          });
        }
        
        if (importedParts.length === 0 && jsonData.length > startIndex) {
            toast({
                title: "No valid parts found",
                description: `The Excel file might be empty or incorrectly formatted. Expected columns in order: ${expectedColumns.join(', ')}. Ensure all ${expectedColumns.length} columns are present.`,
                variant: "destructive",
                duration: 9000,
            });
            return;
        }
        
        let uniqueNewPartsCount = 0;
        setMockParts(prevParts => {
          const existingPartNumbers = new Set(prevParts.map(p => p.partNumber));
          const uniqueNewParts = importedParts.filter(np => {
            if(existingPartNumbers.has(np.partNumber)) {
                console.warn(`Part number ${np.partNumber} already exists. Skipping.`);
                return false;
            }
            return true;
          });
          uniqueNewPartsCount = uniqueNewParts.length;
          return [...prevParts, ...uniqueNewParts];
        });

        toast({
          title: "Import Successful",
          description: `${jsonData.length - startIndex} rows processed. ${uniqueNewPartsCount} new unique parts added. ${importedParts.length - uniqueNewPartsCount} parts were duplicates or had issues and were skipped.`,
          duration: 7000,
        });

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
            fileInputRef.current.value = ""; // Reset file input
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
            fileInputRef.current.value = ""; // Reset file input
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
      expectedColumns, // Header row
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


  const handleAddPartSubmit = (data: PartFormData) => {
    const newPart: Part = { ...data };
    setMockParts(prevParts => [...prevParts, newPart]);
    toast({
      title: "Part Added",
      description: `${data.partName} has been added to the inventory.`,
    });
  };

  const handleEditPartSubmit = (data: PartFormData, originalPartNumber?: string) => {
    if (!originalPartNumber) return; 

    setMockParts(prevParts =>
      prevParts.map(part =>
        part.partNumber === originalPartNumber ? { ...part, ...data, partNumber: originalPartNumber } : part
      )
    );
    toast({
      title: "Part Updated",
      description: `${data.partName} has been updated.`,
    });
    setPartToEdit(null);
  };

  const openAddPartDialog = () => {
    setPartToEdit(null);
    setIsAddPartDialogOpen(true);
  };

  const openEditPartDialog = (part: Part) => {
    setPartToEdit(part);
    setIsEditPartDialogOpen(true);
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
                {filteredParts.map((part) => (
                  <TableRow key={part.partNumber}>
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
        isOpen={isAddPartDialogOpen}
        onOpenChange={setIsAddPartDialogOpen}
        onSubmit={handleAddPartSubmit}
        dialogTitle="Add New Part"
        existingPartNumbers={mockParts.map(p => p.partNumber)}
      />
      {partToEdit && (
        <PartFormDialog
          isOpen={isEditPartDialogOpen}
          onOpenChange={setIsEditPartDialogOpen}
          onSubmit={handleEditPartSubmit}
          initialData={partToEdit}
          dialogTitle="Edit Part"
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

