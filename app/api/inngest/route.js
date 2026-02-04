import {serve} from 'inngest/next';
import {inngest} from '@/app/lib/inngest/client';
import {checkBudgetAlert} from '@/app/lib/inngest/functions';

export const {GET,POST,PUT}=serve({
    client:inngest,
    functions:[
        checkBudgetAlert
    ]
});