"use client";
import { zodResolver } from '@hookform/resolvers/zod';
import useFetch from '@/hooks/use-fetch';
import { accountSchema } from '@/app/lib/schema';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { createAccount } from '@/actions/dashboard';
const CreateAccountDrawer = ({children}) => {
 const [open,setOpen]=   useState(false);
 const {register,
    handleSubmit,
    formState:{errors},
    setValue,
    watch,
    reset} = useForm({
    resolver:zodResolver(accountSchema),
    defaultValues:{
        name:"",
        type:"CURRENT",
        balance:"",
        isDefault:false
 }
});

const [newAccount, createAccountLoading, error, createAccountFn] = useFetch(createAccount);

useEffect(()=>{
    if(newAccount && !createAccountLoading){
        toast.success("Account created successfully");
        reset();
        setOpen(false);
    }
}, [newAccount, createAccountLoading, reset]);

useEffect(()=>{
    if(error){
        toast.error(error.message || "Failed to create account");
    }
},[error])

const onSubmit=async(data)=>{
   await createAccountFn(data);
}
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent>
    <DrawerHeader>
      <DrawerTitle className="text-2xl font-bold">Create New Account</DrawerTitle>
      <DrawerDescription>Add a new account to track your finances</DrawerDescription>
    </DrawerHeader>
    <div className='px-4 pb-4'>
        <form className='space-y-6' onSubmit={handleSubmit(onSubmit)} >
            <div className='space-y-2'>
                <label htmlFor="name" className='text-sm font-semibold'>Account Name</label>
                <Input id="name" placeholder="e.g., Main Checking" className="h-11"
                {...register("name")}></Input>
                {errors.name && <p className='text-red-500 text-sm mt-1'>{errors.name.message}</p>}
            </div>

            <div className='space-y-2'>
                <label htmlFor="type" className='text-sm font-semibold'>Account Type</label>
                <Select onValueChange={(value)=>setValue("type",value)} defaultValue={watch("type")}>
                  <SelectTrigger id="type" className="h-11">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="CURRENT">Current</SelectItem>
                      <SelectItem value="SAVINGS">Savings</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className='text-red-500 text-sm mt-1'>{errors.type.message}</p>}
            </div>

            <div className='space-y-2'>
                <label htmlFor="balance" className='text-sm font-semibold'>Initial Balance</label>
                <Input id="balance" placeholder="0.00" type="number" step="0.01" className="h-11"
                {...register("balance")}></Input>
                {errors.balance && <p className='text-red-500 text-sm mt-1'>{errors.balance.message}</p>}
            </div>

            <div className='flex items-center justify-between rounded-lg border p-4'>
                <div className='space-y-1'>
                    <label htmlFor="isDefault" className='text-sm font-semibold cursor-pointer'>Set as Default</label>
                    <p className='text-sm text-muted-foreground'>This account will be selected by default for transactions</p>
                </div>
                <Switch id='isDefault' onCheckedChange={(value)=>setValue("isDefault", value)} checked={watch("isDefault")} {...register("isDefault")}></Switch>
            </div>

            <div className='flex gap-4 pt-2' >
      <DrawerClose asChild>
        <Button type="button" variant="outline" className="flex-1">Cancel</Button>
      </DrawerClose>
      <Button type="submit" className="flex-1" disabled={createAccountLoading}>{createAccountLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Creating...</> : "Create Account"}</Button>
  </div>
        </form>
    </div>
  </DrawerContent>
</Drawer>
  )
}

export default CreateAccountDrawer
