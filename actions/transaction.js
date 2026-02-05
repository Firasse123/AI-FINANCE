"use server";
import { auth } from "@clerk/nextjs/server";
import { request } from "@arcjet/next";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import aj from "@/lib/arcjet";

const api_key = process.env.OPENROUTER_API_KEY;
const api_url = "https://openrouter.ai/api/v1/chat/completions";
 const model = "openai/gpt-4o-mini";

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
  try{
    const arrayBuffer=await file.arrayBuffer();

    const base64String=Buffer.from(arrayBuffer).toString("base64");

    const prompt=` Analyze this receipt image and extract the following information in JSON format:
      - Total amount (just the number)
      - Date (in ISO format)
      - Description or items purchased (brief summary)
      - Merchant/store name
      - Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense )
      
      Only respond with valid JSON in this exact format:
      {
        "amount": number,
        "date": "ISO date string",
        "description": "string",
        "merchantName": "string",
        "category": "string"
      }

      If its not a recipt, return an empty object
    `;

    
    // Make API call to OpenRouter
    const response = await fetch(api_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${api_key}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Finance App Receipt Scanner",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${file.type};base64,${base64String}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    const text = result.choices[0].message.content;

    // Clean the response text
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    try {
      const data = JSON.parse(cleanedText);
      
      // Check if empty object (not a receipt)
      if (Object.keys(data).length === 0) {
        throw new Error("This doesn't appear to be a receipt");
      }

      return {
        amount: parseFloat(data.amount),
        date: new Date(data.date),
        description: data.description,
        category: data.category,
        merchantName: data.merchantName,
      };
    } catch (parseError) {
      console.error("Error parsing JSON from model response:", parseError);
      console.error("Raw response:", text);
      throw new Error("Failed to extract data from receipt. Please try again.");
    }
  } catch (error) {
    console.error("Error processing receipt:", error);
    throw new Error("Error processing receipt: " + error.message);
  }
}
