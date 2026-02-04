import {inngest} from "./client";
import { db } from "@/lib/prisma";

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