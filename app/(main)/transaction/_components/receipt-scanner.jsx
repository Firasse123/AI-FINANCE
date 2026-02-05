"use client";
import React from 'react'
import { useRef } from 'react';
import { useEffect } from 'react';
import useFetch from '@/hooks/use-fetch';
import { scanReceipt } from '@/actions/transaction';
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { toast } from 'sonner';
const ReceiptScanner = ({onScanComplete}) => {
  const fileInputRef = useRef(null);

  const [scannedData, scanReceiptLoading, , scanReceiptFn] = useFetch(scanReceipt);

  const handleReceiptScan = async (file) => {
    if(file.size>5*1024*1024){
        toast.error("File size shoul be less than 5MB");
        return;
    }
    await scanReceiptFn(file);
  };

  useEffect(()=>{
    if(scannedData && !scanReceiptLoading){
        onScanComplete(scannedData);
        toast.success("Receipt scanned successfully!");
    }
  },[scannedData,scanReceiptLoading]);

  return (
    <div>
      <input type="file"
       ref={fileInputRef}
       className='hidden'
       accept="image/*"
       capture="environment"
       onChange={(e)=>{
        const file=e.target.files?.[0];
        if(file) handleReceiptScan(file);
       }}/>
    <Button
        type="button"
        variant="outline"
        className="w-full h-10 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 animate-gradient hover:opacity-90 transition-opacity text-white hover:text-white"
        onClick={() => fileInputRef.current?.click()}
        disabled={scanReceiptLoading}
      >
        {scanReceiptLoading ? (
          <>
            <Loader2 className="mr-2 animate-spin" />
            <span>Scanning Receipt...</span>
          </>
        ) : (
          <>
            <Camera className="mr-2" />
            <span>Scan Receipt with AI</span>
          </>
        )}
      </Button>    </div>
  )
}

export default ReceiptScanner
