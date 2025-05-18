
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

const initialMockParts: Part[] = [
  { partName: 'Spark Plug X100', otherName: 'Ignition Plug', partNumber: 'P001', company: 'Bosch', quantity: 150, category: 'Engine', mrp: '$5.99', shelf: 'A1-01' },
  { partName: 'Oil Filter Z20', partNumber: 'P002', company: 'Mann-Filter', quantity: 80, category: 'Engine', mrp: '$12.50', shelf: 'A1-02' },
  { partName: 'Brake Pad Set F5', otherName: 'Front Brakes', partNumber: 'P003', company: 'Brembo', quantity: 120, category: 'Brakes', mrp: '$45.00', shelf: 'B2-05' },
  { partName: 'Headlight Bulb H4', partNumber: 'P004', company: 'Philips', quantity: 200, category: 'Lighting', mrp: '$8.75', shelf: 'C3-10' },
  { partName: 'Air Filter A300', otherName: 'Engine Air Cleaner', partNumber: 'P005', company: 'K&N', quantity: 95, category: 'Filtration', mrp: '$18.20', shelf: 'A1-03' },
];

export default function InventoryPage() {
  const { toast } = useToast();
  const [mockParts, setMockParts] = useState<Part[]>(initialMockParts);
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
        description: "Please select a CSV file to import.",
        variant: "destructive",
      });
      return;
    }

    if (file.type !== 'text/csv') {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast({
          title: "Error reading file",
          description: "Could not read the file content.",
          variant: "destructive",
        });
        return;
      }

      try {
        const importedParts: Part[] = [];
        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
        
        const headerLine = lines[0]?.toLowerCase();
        // Basic header check, adjust keywords if your common headers are different
        const headerKeywords = ['part name', 'partnumber', 'part number', 'company', 'category', 'qty', 'mrp'];
        const isHeaderPresent = headerLine && headerKeywords.some(keyword => headerLine.includes(keyword));
        const startIndex = isHeaderPresent ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          // Split by comma, but rudimentary: won't handle commas inside quoted fields well.
          const values = line.split(',').map(value => value.trim().replace(/^"|"$/g, '')); // Trim and remove surrounding quotes
          
          // Expect 8 columns as per the new order: Part Name, Company, Part Number, Category, Qty, MRP, Shelf, Other Name
          if (values.length < 8) { 
            console.warn(`Skipping malformed line ${i + 1}: ${line} (expected 8 columns, got ${values.length})`);
            continue;
          }
          
          const [
            csvPartName,     // values[0]
            csvCompany,      // values[1]
            csvPartNumber,   // values[2]
            csvCategory,     // values[3]
            csvQuantityStr,  // values[4]
            csvMrp,          // values[5]
            csvShelf,        // values[6]
            csvOtherName     // values[7]
          ] = values;

          const quantity = parseInt(csvQuantityStr, 10);

          if (isNaN(quantity)) {
            console.warn(`Skipping line ${i + 1} due to invalid quantity: ${csvQuantityStr}`);
            continue;
          }

          if (!csvPartNumber || !csvPartName) {
            console.warn(`Skipping line ${i + 1} due to missing Part Number or Part Name (Part Number: ${csvPartNumber}, Part Name: ${csvPartName}).`);
            continue;
          }

          importedParts.push({
            partName: csvPartName,
            otherName: csvOtherName || undefined, 
            partNumber: csvPartNumber,
            company: csvCompany || undefined,
            quantity,
            category: csvCategory,
            mrp: csvMrp.startsWith('$') || csvMrp.startsWith('₹') ? csvMrp : `$${csvMrp}`,
            shelf: csvShelf || undefined,
          });
        }

        if (importedParts.length === 0 && lines.length > startIndex) {
            toast({
                title: "No valid parts found",
                description: "The CSV file might be empty or incorrectly formatted. Expected columns: Part Name, Company, Part Number, Category, Qty, MRP, Shelf, Other Name (Optional).",
                variant: "destructive",
                duration: 7000,
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
          description: `${lines.length - startIndex} lines processed. ${uniqueNewPartsCount} new unique parts added to the inventory. ${importedParts.length - uniqueNewPartsCount} parts were duplicates or had issues and were skipped.`,
          duration: 7000,
        });

      } catch (error) {
        console.error("Error parsing CSV:", error);
        toast({
          title: "Import Failed",
          description: "There was an error parsing the CSV file. Please ensure it's correctly formatted. Expected columns: Part Name, Company, Part Number, Category, Qty, MRP, Shelf, Other Name (Optional).",
          variant: "destructive",
          duration: 7000,
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
    reader.readAsText(file);
  };

  const handleExportToCSV = () => {
    if (mockParts.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no parts in the inventory to export.",
        variant: "destructive"
      });
      return;
    }
    // New CSV export order: Part Name, Company, Part Number, Category, Qty, MRP, Shelf, Other Name
    const headers = ["Part Name", "Company", "Part Number", "Category", "Qty", "MRP", "Shelf", "Other Name"];
    const csvRows = [
      headers.join(','),
      ...mockParts.map(part => [
        `"${(part.partName || '').replace(/"/g, '""')}"`,
        `"${(part.company || '').replace(/"/g, '""')}"`,
        `"${(part.partNumber || '').replace(/"/g, '""')}"`,
        `"${(part.category || '').replace(/"/g, '""')}"`,
        part.quantity,
        `"${(part.mrp || '').replace(/"/g, '""')}"`,
        `"${(part.shelf || '').replace(/"/g, '""')}"`,
        `"${(part.otherName || '').replace(/"/g, '""')}"`,
      ].join(','))
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'inventory.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Export Successful",
        description: "Inventory data has been exported to inventory.csv.",
      });
    } else {
       toast({
        title: "Export Failed",
        description: "Your browser does not support direct CSV download.",
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
          accept=".csv"
          style={{ display: 'none' }}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventory Management</h1>
            <p className="text-muted-foreground">Manage your automotive parts stock efficiently.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleImportClick}>
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </Button>
            <Button variant="outline" onClick={handleExportToCSV}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
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
              Browse, search, and manage your inventory parts. For CSV import, use columns in this order: 
              Part Name, Company, Part Number, Category, Qty, MRP, Shelf, Other Name (Optional - column must exist, can be empty).
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
                    {mockParts.length > 0 && searchTerm ? 'No parts match your search.' : 'No parts found. Add new parts or import from a CSV file to get started.'}
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
