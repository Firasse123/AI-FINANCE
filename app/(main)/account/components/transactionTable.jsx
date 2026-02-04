"use client";
import React, { useMemo, useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { categoryColors } from '@/data/categories';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge"
import { Clock, RefreshCcw } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Trash } from 'lucide-react';
import { X } from 'lucide-react';
import useFetch from '@/hooks/use-fetch';
import BarLoader from "react-spinners/BarLoader";
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { bulkDeleteTransactions } from '@/actions/accounts';
const ITEMS_PER_PAGE = 10;
const RECURRING_INTERVALS = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};
const TransactionTable = ({transactions}) => {
    const router=useRouter();
    const [selectedIds,setSelectedIds]=useState([]);
    const [sortConfig,setSortConfig]=useState([{
      field:"date",direction:"desc"
    }]);

    const [searchTerm,setSearchTerm]=useState("");
    const [typeFilter,setTypeFilter]=useState("");
    const [recurringFilter,setRecurringFilter]=useState("");
    const [currentPage, setCurrentPage] = useState(1);



    const filterAndSortedTransactions = useMemo(() => {
        let result=[...transactions];

          if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter((transaction) =>
        transaction.description?.toLowerCase().includes(searchLower)
      );
    }
if(recurringFilter){
  result=result.filter((transaction)=>{
    if(recurringFilter==="recurring") return transaction.isRecurring;
    return !transaction.isRecurring;
  })
}
    if(typeFilter){
      result=result.filter((transaction)=> transaction.type===typeFilter )
    }

    //Apply Sorting
result.sort((a,b)=>{
  let comparison=0
  switch(sortConfig.field){
    case "date":
      comparison=new Date(a.date)-new Date(b.date);
      break;
    case "amount":
      comparison=a.amount - b.amount;
      break;
    case "category":
      comparison=a.category.localeCompare(b.category);
      break;
    default:
      comparison=0;
  }
  return sortConfig.direction==="asc" ? comparison : -comparison;
})

        return result;
    },[

        transactions,
        searchTerm,
        typeFilter,
        recurringFilter,
        sortConfig
      ]) 

        // Pagination calculations
  const totalPages = Math.ceil(
    filterAndSortedTransactions.length / ITEMS_PER_PAGE
  );
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filterAndSortedTransactions.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE
    );
  }, [filterAndSortedTransactions, currentPage]);
  


    const handleSort=(field)=>{
      setSortConfig(current=>({
        field,
        direction:
        current.field==field && current.direction==="asc" ? "desc" : "asc"
      }))}


  const handleSelect = (id) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };    

    const handleSelectAll=()=>{
        setSelectedIds((current) =>
      current.length===paginatedTransactions.length && paginatedTransactions.every(t => current.includes(t.id))
        ? []
        : paginatedTransactions.map((item) => item.id)
    );
    };

    
 const [deleted, deleteLoading, , deleteFn] = useFetch(bulkDeleteTransactions);

    const handleBulkDelete=async()=>{
      if(!window.confirm(`Are you sure you want to delete ${selectedIds.length} transactions? This action cannot be undone.`))
        {
          return;
    }
    deleteFn(selectedIds);}
     useEffect(() => {
    if (deleted && !deleteLoading) {
      toast.success("Transactions deleted successfully");
      setSelectedIds([]);
    }
  }, [deleted, deleteLoading]);


    const handleClearFilters=()=>{
      setSearchTerm("");
      setTypeFilter("");
      setRecurringFilter("");
      setSelectedIds([]);
        setCurrentPage(1);
    }
     const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setSelectedIds([]); // Clear selections on page change
  };

  return (
    <div className='space-y-4'>
{deleteLoading && (
        <BarLoader className="mt-4" width={"100%"} color="#9333ea" />
      )}

      {/* Filters */}
      <div className='flex flex-col sm:flex-row gap-4'>
        <div className='relative flex-1'>
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Search transactions..." value={searchTerm}
           onChange={(e)=>{setSearchTerm(e.target.value);
               setCurrentPage(1);
           } }

           className="pl-8"/>

        </div>

        <div className='flex gap-4'>
          <Select value={typeFilter} onValueChange={(value) => {setTypeFilter(value); setCurrentPage(1);}}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="All Types" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectItem value="INCOME">Income</SelectItem>
      <SelectItem value="EXPENSE">Expense</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
  <Select
            value={recurringFilter}
            onValueChange={(value) => {
              setRecurringFilter(value);
              setCurrentPage(1);
            }}
          >
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="All Transactions" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectItem value="recurring">Recurring Only</SelectItem>
      <SelectItem value="non-recurring">Non-Recurring Only</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>

{selectedIds.length > 0 &&
 (<div className='flex items-center gap-2'>
  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
    <Trash className="h-4 w-4 mr-2" />
  Delete Selected
   ({selectedIds.length})
  </Button></div>)}

          {(searchTerm || typeFilter || recurringFilter || selectedIds.length > 0) && (
            <Button   variant="outline"
              size="icon"
              onClick={handleClearFilters}
              title="Clear filters"><X className="h-4 w-4" /></Button>)}
        </div>
      </div>

     {/* Transactions */}
<div className='rounded-md border'>
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-[50px]">
        <Checkbox onCheckedChange={handleSelectAll} checked={paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedIds.includes(t.id))} />
        </TableHead>
      <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
        <div className='flex items-center'>Date{sortConfig.field === "date" &&
                    (sortConfig.direction === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}</div>
      </TableHead>
      <TableHead>Description</TableHead>
       <TableHead className="cursor-pointer" onClick={() => handleSort("category")}>
        <div className='flex items-center'>Category{sortConfig.field === "category" &&
                    (sortConfig.direction === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}</div>

      </TableHead>
       <TableHead className="cursor-pointer text-right" onClick={() => handleSort("amount")}>
        <div className='flex items-center justify-end'>Amount{sortConfig.field === "amount" &&
                    (sortConfig.direction === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}</div>
      </TableHead>
    <TableHead className="pl-8">Recurring</TableHead>
    <TableHead className="w-[50px]"/>
    </TableRow>
  </TableHeader>
  <TableBody>
    {filterAndSortedTransactions.length ===0 ? (
        <TableRow>
            <TableCell className="text-center text-muted-foreground" colSpan={7}>
                No Transactions Found.
            </TableCell>
        </TableRow>
    ) : (
        paginatedTransactions.map((transaction)=>(
            <TableRow key={transaction.id}>
            <TableCell ><Checkbox onCheckedChange={() => handleSelect(transaction.id)} checked={selectedIds.includes(transaction.id)} /></TableCell>
            <TableCell>{format(new Date(transaction.date),"PP")}</TableCell>
            <TableCell>{transaction.description}</TableCell>
            <TableCell className="capitalize"> <span
                      style={{
                        background: categoryColors[transaction.category],
                      }}
                      className="px-2 py-1 rounded text-white text-sm"
                    >{transaction.category}</span></TableCell>
            <TableCell  className={cn(
                      "text-right font-medium",
                      transaction.type === "EXPENSE"
                        ? "text-red-500"
                        : "text-green-500"
                    )}>{transaction.type==="EXPENSE" ? "-" : "+"}${transaction.amount.toFixed(2)}</TableCell>
                    <TableCell className="pl-8">
                        {transaction.isRecurring ? (
                    <Tooltip>
                    <TooltipTrigger><Badge variant="secondary"
                              className="gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200">
                            <RefreshCcw className="w-3 h-3"/>
                            {RECURRING_INTERVALS[transaction.recurringInterval]}</Badge></TooltipTrigger>
                    <TooltipContent>
                        <div className='text-sm'>
                            <div>Next Date:</div>
                            <div>{format(new Date(transaction.nextRecurringDate),"PP")}</div>
                        </div>            
                                </TooltipContent>
                    </Tooltip>
                        ): (<Badge variant='outline' className="gap-1">
                            <Clock className="w-3 h-3"/>
                            One-time</Badge>)}
                    </TableCell>
                    <TableCell>
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className="h-8 w-8 p-0">
        <MoreHorizontal className="w-4 h-4"/>
        </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuGroup>
      <DropdownMenuItem
      onClick={()=>router.push(
        `/transaction/create?edit=${transaction.id}`
      )}>Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
      <DropdownMenuItem className='text-destructive' 
      onClick={()=>deleteFn([transaction.id])}>
        Delete</DropdownMenuItem>
    </DropdownMenuGroup>
    <DropdownMenuGroup>
    </DropdownMenuGroup>
  </DropdownMenuContent>
</DropdownMenu>

                    </TableCell>

        </TableRow>
        ))
     
    )}
  </TableBody>
</Table>
</div>

 {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

    </div>
  )
}

export default TransactionTable
