
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Download, Upload, Search, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import React, { useState, useRef } from 'react'; // Added useRef and useState

// Define Part type matching mock data structure
interface Part {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: string;
}

const initialMockParts: Part[] = [
  { id: 'P001', name: 'Spark Plug X100', category: 'Engine', quantity: 150, price: '$5.99' },
  { id: 'P002', name: 'Oil Filter Z20', category: 'Engine', quantity: 80, price: '$12.50' },
  { id: 'P003', name: 'Brake Pad Set F5', category: 'Brakes', quantity: 120, price: '$45.00' },
  { id: 'P004', name: 'Headlight Bulb H4', category: 'Lighting', quantity: 200, price: '$8.75' },
  { id: 'P005', name: 'Air Filter A300', category: 'Filtration', quantity: 95, price: '$18.20' },
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
        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== ''); // Split by new line and remove empty lines
        
        // Skip header row if present (optional, simple check for common headers)
        const headerLine = lines[0]?.toLowerCase();
        const startIndex = (headerLine?.includes('part number') || headerLine?.includes('name') || headerLine?.includes('id')) ? 1 : 0;
        let uniqueNewPartsCount = 0;

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          // Basic CSV parsing: split by comma, trim whitespace.
          // This doesn't handle commas within quoted fields. For robust parsing, a library would be better.
          const values = line.split(',').map(value => value.trim());
          
          if (values.length < 5) { // Expecting Part Number, Name, Category, Quantity, Price
            console.warn(`Skipping malformed line ${i + 1}: ${line}`);
            continue;
          }
          
          const [id, name, category, quantityStr, price] = values;
          const quantity = parseInt(quantityStr, 10);

          if (isNaN(quantity)) {
            console.warn(`Skipping line ${i + 1} due to invalid quantity: ${quantityStr}`);
            continue;
          }

          // Basic validation: ensure id and name are present
          if (!id || !name) {
            console.warn(`Skipping line ${i + 1} due to missing ID or Name.`);
            continue;
          }

          newParts.push({
            id,
            name,
            category,
            quantity,
            price: price.startsWith('$') ? price : `$${price}`, // Ensure price has a $ prefix
          });
        }

        if (newParts.length === 0 && lines.length > startIndex) {
            toast({
                title: "No valid parts found",
                description: "The CSV file might be empty or incorrectly formatted. Expected columns: Part Number, Name, Category, Quantity, Price.",
                variant: "destructive",
            });
            return;
        }
        
        // For demonstration, we'll merge new parts with existing ones.
        // A more sophisticated approach might involve checking for duplicates or updating existing parts.
        setMockParts(prevParts => {
          const existingIds = new Set(prevParts.map(p => p.id));
          const uniqueNewParts = newParts.filter(np => !existingIds.has(np.id));
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
          description: "There was an error parsing the CSV file. Please ensure it's correctly formatted. Expected columns: Part Number, Name, Category, Quantity, Price.",
          variant: "destructive",
        });
      } finally {
        // Reset file input value to allow re-uploading the same file
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

  const handleEditPartClick = (partId: string) => {
    toast({
      title: "Edit Part",
      description: `Edit functionality for part ${partId} is not implemented yet.`,
    });
  };

  const handleDeletePartClick = (partId: string) => {
    toast({
      title: "Delete Part",
      description: `Delete functionality for part ${partId} is not implemented yet.`,
      variant: "destructive",
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Hidden file input */}
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
            <CardDescription>Browse, search, and manage your inventory parts. For CSV import, use columns: Part Number, Name, Category, Quantity, Price.</CardDescription>
             <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by part number or name..." className="pl-10 w-full sm:w-1/2 lg:w-1/3" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockParts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-medium">{part.id}</TableCell>
                    <TableCell>{part.name}</TableCell>
                    <TableCell>{part.category}</TableCell>
                    <TableCell className="text-right">{part.quantity}</TableCell>
                    <TableCell className="text-right">{part.price}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleEditPartClick(part.id)}>
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeletePartClick(part.id)}>
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
