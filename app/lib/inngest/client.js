import {Inngest} from "inngest";

export const inngest=new Inngest({
    id:"finance",
    name:"finance",
    retryFunction:async(attempt)=>({
        delay:Math.pow(2,attempt)*1000,
        maxAttempts:2
    })
})