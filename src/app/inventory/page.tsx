
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Download, Upload, Search, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import React, { useState, useRef } from 'react';

// Define Part type matching new attributes
interface Part {
  partName: string;
  otherName?: string;
  partNumber: string; // Used as unique ID
  company?: string;
  quantity: number;
  category: string;
  mrp: string;
  shelf?: string;
}

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
        const newParts: Part[] = [];
        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
        
        const headerLine = lines[0]?.toLowerCase();
        // A more robust header check might be needed, this is a simple check
        const startIndex = (headerLine?.includes('part name') || headerLine?.includes('partnumber') || headerLine?.includes('part number')) ? 1 : 0;
        let uniqueNewPartsCount = 0;

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          const values = line.split(',').map(value => value.trim());
          
          // Expecting: Part Name, Other Name, Part Number, Company, Qty, Category, MRP, Shelf
          if (values.length < 8) { 
            console.warn(`Skipping malformed line ${i + 1}: ${line} (expected 8 columns)`);
            continue;
          }
          
          const [partName, otherName, partNumber, company, quantityStr, category, mrp, shelf] = values;
          const quantity = parseInt(quantityStr, 10);

          if (isNaN(quantity)) {
            console.warn(`Skipping line ${i + 1} due to invalid quantity: ${quantityStr}`);
            continue;
          }

          if (!partNumber || !partName) {
            console.warn(`Skipping line ${i + 1} due to missing Part Number or Part Name.`);
            continue;
          }

          newParts.push({
            partName,
            otherName: otherName || undefined,
            partNumber,
            company: company || undefined,
            quantity,
            category,
            mrp: mrp.startsWith('$') ? mrp : `$${mrp}`,
            shelf: shelf || undefined,
          });
        }

        if (newParts.length === 0 && lines.length > startIndex) {
            toast({
                title: "No valid parts found",
                description: "The CSV file might be empty or incorrectly formatted. Expected columns: Part Name, Other Name, Part Number, Company, Qty, Category, MRP, Shelf.",
                variant: "destructive",
            });
            return;
        }
        
        setMockParts(prevParts => {
          const existingPartNumbers = new Set(prevParts.map(p => p.partNumber));
          const uniqueNewParts = newParts.filter(np => !existingPartNumbers.has(np.partNumber));
          uniqueNewPartsCount = uniqueNewParts.length;
          return [...prevParts, ...uniqueNewParts];
        });

        toast({
          title: "Import Successful",
          description: `${newParts.length} parts processed. ${uniqueNewPartsCount} new parts added to the inventory.`,
        });

      } catch (error) {
        console.error("Error parsing CSV:", error);
        toast({
          title: "Import Failed",
          description: "There was an error parsing the CSV file. Please ensure it's correctly formatted. Expected columns: Part Name, Other Name, Part Number, Company, Qty, Category, MRP, Shelf.",
          variant: "destructive",
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
    reader.readAsText(file);
  };

  const handleExportClick = () => {
    toast({
      title: "Export Action",
      description: "Export functionality is not implemented yet.",
    });
  };

  const handleAddPartClick = () => {
    toast({
      title: "Add Part Action",
      description: "Add part functionality is not implemented yet.",
    });
  };

  const handleEditPartClick = (partNum: string) => {
    toast({
      title: "Edit Part",
      description: `Edit functionality for part ${partNum} is not implemented yet.`,
    });
  };

  const handleDeletePartClick = (partNum: string) => {
    toast({
      title: "Delete Part",
      description: `Delete functionality for part ${partNum} is not implemented yet.`,
      variant: "destructive",
    });
  };

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
            <Button variant="outline" onClick={handleExportClick}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button onClick={handleAddPartClick}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Part
            </Button>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Parts List</CardTitle>
            <CardDescription>Browse, search, and manage your inventory parts. For CSV import, use columns: Part Name, Other Name, Part Number, Company, Qty, Category, MRP, Shelf.</CardDescription>
             <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by part name or number..." className="pl-10 w-full sm:w-1/2 lg:w-1/3" />
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
                {mockParts.map((part) => (
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
                      <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleEditPartClick(part.partNumber)}>
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeletePartClick(part.partNumber)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {mockParts.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    No parts found. Add new parts or import from a CSV file to get started.
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
