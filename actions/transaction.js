"use server";
import { auth } from "@clerk/nextjs/server";
import { request } from "@arcjet/next";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import aj from "@/lib/arcjet";


const serializeAmount = (obj) => ({
  ...obj,
  amount: obj.amount.toNumber(),
});
export async function createTransaction(data){
      try{
                const {userId}=await auth();
                if(!userId) throw new Error("Unauthorized!");

                // TODO: Implement Arcjet protection for Server Actions
                 const req=await request();
                 const decision=await aj.protect(req,{
                    userId,
                    requested:1
                })
                 if(decision.isDenied()){
                    if(decision.reason.isRateLimit()){
                       const{remaining,reset}=decision.reason;
                      console.error({
                  code: "RATE_LIMIT_EXCEEDED",
                  details: {
                     remaining,
                     resetInSeconds: reset,
                   },
                 });
                    throw new Error("Too many requests. Please try again later.");
                   }
                   throw new Error("Request blocked");
                 }
        
                const user=await db.user.findUnique({
                    where:{
                        clerkUserId:userId
                    }
                });
                if(!user){
                    throw new Error("User not found");
                }

                const account=await db.account.findUnique({
                    where:{
                        id:data.accountId,
                        userId:user.id
                    }
                });
                if(!account){
                    throw new Error("Account not found");
                }

                const balanceChange=data.type==="INCOME"?data.amount:-data.amount;
                const newBalance=account.balance.toNumber()+balanceChange;

                const transaction=await db.$transaction(async(tx)=>{
                    const newTransaction= await tx.transaction.create({
                        data:{
                            ...data,
                            userId:user.id,
                            nextRecurringDate:data.isRecurring && data.recurringInterval ? 
                            calculateNextRecurringDate(data.date, data.recurringInterval)
                            :null,
                        }
                    });
            await tx.account.update({
                where:{
                    id:data.accountId
                },
                data:{
                    balance:newBalance
                }
            })
            return newTransaction;
                })
                revalidatePath("/dashboard");
                revalidatePath(`/account/${transaction.accountId}`);
    return { success: true, data: serializeAmount(transaction) };

}
catch(error){
    console.error("Error creating transaction:", error);
        throw new Error(error.message);

}
}

export async function updateTransaction(transactionId, data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized!");

    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });
    if (!user) {
      throw new Error("User not found");
    }

    // Get the existing transaction
    const existingTransaction = await db.transaction.findUnique({
      where: {
        id: transactionId,
        userId: user.id,
      },
    });

    if (!existingTransaction) {
      throw new Error("Transaction not found");
    }

    // Calculate balance adjustments
    const oldBalanceChange =
      existingTransaction.type === "INCOME"
        ? -existingTransaction.amount.toNumber()
        : existingTransaction.amount.toNumber();

    const newBalanceChange =
      data.type === "INCOME" ? data.amount : -data.amount;

    const netBalanceChange = oldBalanceChange + newBalanceChange;

    // Update transaction and account balance in a transaction
    const updatedTransaction = await db.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: {
          id: transactionId,
        },
        data: {
          ...data,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      await tx.account.update({
        where: {
          id: data.accountId,
        },
        data: {
          balance: {
            increment: netBalanceChange,
          },
        },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${updatedTransaction.accountId}`);
    return { success: true, data: serializeAmount(updatedTransaction) };
  } catch (error) {
    console.error("Error updating transaction:", error);
    throw new Error(error.message);
  }
}

// Helper function to calculate next recurring date
function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);

  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date;
}

export async function scanReceipt(file){

}