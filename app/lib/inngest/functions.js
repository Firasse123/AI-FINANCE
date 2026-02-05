import {inngest} from "./client";
import { db } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import EmailTemplate from "@/emails/template";

export const checkBudgetAlert=inngest.createFunction(
    {name:"Check Budget Alerts"},
    {cron:"0 */6 * * *"}, // every 6 hours
    async({step})=> {
     const budgets = await step.run("fetch-budgets", async () => {
      return await db.budget.findMany({
        include: {
          user: {
            include: {
              accounts: {
                where: {
                  isDefault: true,
                },
              },
            },
          },
        },
      });
    });

    for(const budget of budgets){
        const defaultAccount=budget.user.accounts[0];
        if(!defaultAccount) continue;//skip if no default account
        await step.run(`check-budget-${budget.id}`,async()=>{
        
        const currentDate=new Date();
        const startOfMonth=new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() ,
        1      );

        const endOfMonth=new Date(
        currentDate.getFullYear(),
        currentDate.getMonth()+1 ,
        0     );
              // Calculate total expenses for the default account only

            const expenses=await db.transaction.aggregate({
            where: {
            userId: budget.userId,
            accountId: defaultAccount.id, // Only consider default account
            type: "EXPENSE",
            date:{
                    gte:startOfMonth,
                    lte:endOfMonth
                },
          },
          _sum: {
            amount: true,
          },
            });

        const totalExpenses = expenses._sum.amount?.toNumber() || 0;
        const budgetAmount = Number(budget.amount);
        const percentageUsed = (totalExpenses / budgetAmount) * 100;

        if(percentageUsed >= 80 && (!budget.lastAlertSent || isNewMonth(new Date(budget.lastAlertSent), new Date())))
            {
                //Send Email 
                await sendEmail({
                    to:budget.user.email,
                    subject:`Budget Alert for ${defaultAccount.name}`,
                    react:EmailTemplate({
                        userName:budget.user.name,
                        type: "budget-alert",
                        data: {
                            percentageUsed,
                            budgetAmount: budgetAmount,
                            totalExpenses: totalExpenses,
                            accountName:defaultAccount.name,
                        }
                    })
                })

                //Update lastAlertSent
                await db.budget.update({
                    where:{id:budget.id},
                    data:{lastAlertSent:new Date()}
                })
            }

        })
    }
    }
);

function isNewMonth(lastAlertDate, currentDate) {
  return (
    lastAlertDate.getMonth() !== currentDate.getMonth() ||
    lastAlertDate.getFullYear() !== currentDate.getFullYear()
  );
}

export const triggerRecurringTransactions=inngest.createFunction({
  id:"trigger-recurring-transactions",
  name:"Trigger Recurring Transactions",

  

},{cron:"0 0 * * *"} // every day at midnight
  ,async({step})=>{
    const recurringTransactions=await step.run(
      "fetch-recurring-transactions",
      async()=>{
        return await db.transaction.findMany({
          where:{
            isRecurring:true,
            status:"COMPLETED",
            OR:[
              {lastProcessed:null},//Never processed
              {nextRecurringDate:{lte:new Date()}},//Due date passed
            ]
          }
        })
      }
    )

    //2.Create events for each transaction
    if(recurringTransactions.length>0){
      const events=recurringTransactions.map((transaction)=>({
        name:"transaction.recurring.process",
        data:{transactionId:transaction.id,userId:transaction.userId}
      }))
        //3.send events to be processed
      await inngest.send(events)
    }
    return {triggered:recurringTransactions.length}
  });

  export const processRecurringTransaction=inngest.createFunction({
    id:"process-recurring-transaction",
    throttle:{
      limit:10, //Only process 10 transactions
      period:"1m", //per minute
      key:"event.data.userId" //per user
    },
    
  },
    {event:"transaction.recurring.process" },
    async({event,step})=>{
         // Validate event data
    if (!event?.data?.transactionId || !event?.data?.userId) {
      console.error("Invalid event data:", event);
      return { error: "Missing required event data" };
    }
   await step.run("process-transaction", async () => {
      const transaction = await db.transaction.findUnique({
        where: {
          id: event.data.transactionId,
          userId: event.data.userId,
        },
        include: {
          account: true,
        },
      });
        if (!transaction || !isTransactionDue(transaction)) return;

        await db.$transaction(async(tx)=>{
          //Create new transaction
 await tx.transaction.create({
          data: {
            type: transaction.type,
            amount: transaction.amount,
            description: `${transaction.description} (Recurring)`,
            date: new Date(),
            category: transaction.category,
            userId: transaction.userId,
            accountId: transaction.accountId,
            isRecurring: false,
          },   
        });   
          const balanceChange =
          transaction.type === "EXPENSE"
            ? -transaction.amount.toNumber()
            : transaction.amount.toNumber();

        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: balanceChange } },
        });

        await tx.transaction.update({
          where: { id: transaction.id },
          data:{
            lastProcessed:new Date(),
            nextRecurringDate: calculateNextRecurringDate(
              new Date(),
              transaction.recurringInterval),
          },
          })
    });
  });
    }
  );


  export const generateMonthlyReport=inngest.createFunction({
    id:"generate-monthly-report",
    name:"Generate Monthly Report",},

    {cron: "0 0 1 * *"}, // every month on the 1st at midnight
    async({step})=>{
      const users=await step.run("fetch-users", async()=>{
        return await db.user.findMany({
          include:{
            accounts:true,
          }
        })
      });
      for(const user of users){
        await step.run(`generate-report-${user.id}`, async()=>{
        const lastMonth=new Date();
        lastMonth.setMonth(lastMonth.getMonth()-1);

        const stats=await getMonthlyStats(user.id, lastMonth);
        const monthName=lastMonth.toLocaleString("default",{month:"long",year:"numeric"});
        
        const insights=await generateFinancialInsights(stats,monthName);
        await sendEmail({
          to: user.email,
          subject: `Your Monthly Financial Report - ${monthName}`,
          react: EmailTemplate({
            userName: user.name,
            type: "monthly-report",
            data: {
              stats,
              month: monthName,
              insights,
            },
          }),
        });
      });
    }
    return {processed:users.length}
    }
  
  )

  async function generateFinancialInsights(stats, monthName) {
  const api_key = process.env.OPENROUTER_API_KEY;
const api_url = "https://openrouter.ai/api/v1/chat/completions";
 const model = "openai/gpt-4o-mini";

 const prompt= `
    Analyze this financial data and provide 3 concise, actionable insights.
    Focus on spending patterns and practical advice.
    Keep it friendly and conversational.

    Financial Data for ${monthName}:
    - Total Income: $${stats.totalIncome}
    - Total Expenses: $${stats.totalExpenses}
    - Net Income: $${stats.totalIncome - stats.totalExpenses}
    - Expense Categories: ${Object.entries(stats.byCategory)
      .map(([category, amount]) => `${category}: $${amount}`)
      .join(", ")}

    Format the response as a JSON array of strings, like this:
    ["insight 1", "insight 2", "insight 3"]
  `;

  try{
     const response = await fetch(api_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${api_key}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Finance App Insights Generator",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: prompt,
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
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const insights = JSON.parse(cleanedText);
    if (!Array.isArray(insights)) {
        throw new Error("Response is not an array");
      }
      
      return insights;

  }
  catch (error) {
    console.error("Error generating insights:", error);
    return [
      "Your highest expense category this month might need attention.",
      "Consider setting up a budget for better financial management.",
      "Track your recurring expenses to identify potential savings.",
    ];
  }
}
async function getMonthlyStats(userId, month) {
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const transactions = await db.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  return transactions.reduce(
    (stats, t) => {
      const amount = t.amount.toNumber();
      if (t.type === "EXPENSE") {
        stats.totalExpenses += amount;
        stats.byCategory[t.category] =
          (stats.byCategory[t.category] || 0) + amount;
      } else {
        stats.totalIncome += amount;
      }
      return stats;
    },
    {
      totalExpenses: 0,
      totalIncome: 0,
      byCategory: {},
      transactionCount: transactions.length,
    }
  );
}
function isTransactionDue(transaction) {
  // If no lastProcessed date, transaction is due
  if (!transaction.lastProcessed) return true;

  const today = new Date();
  const nextDue = new Date(transaction.nextRecurringDate);

  // Compare with nextDue date
  return nextDue <= today;
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