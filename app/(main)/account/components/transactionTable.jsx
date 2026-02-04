"use client";
import React from 'react'
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { categoryColors } from '@/data/categories';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge"
import { Clock, RefreshCcw } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
    const filterAndSortedTransactions = transactions;
    const handleSort=()=>{

    }
  return (
    <div className='space-y-4'>
      {/* Filters */}

     {/* Transactions */}
<div className='rounded-md border'>
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-[50px]">
        <Checkbox/>
        </TableHead>
      <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
        <div className='flex items-center'>Date</div>
      </TableHead>
      <TableHead>Description</TableHead>
       <TableHead className="cursor-pointer" onClick={() => handleSort("category")}>
        <div className='flex items-center'>Category</div>

      </TableHead>
       <TableHead className="cursor-pointer" onClick={() => handleSort("amount")}>
        <div className='flex items-center'>Amount</div>
      </TableHead>
    <TableHead className="text-right">Recurring</TableHead>
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
        filterAndSortedTransactions.map((transaction)=>(
            <TableRow key={transaction.id}>
            <TableCell ><Checkbox/></TableCell>
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
                    <TableCell>
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
      <DropdownMenuLabel
      onClick={()=>router.push(
        `/transaction/create?edit=${transaction.id}`
      )}>Edit</DropdownMenuLabel>
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
    </div>
  )
}

export default TransactionTable
