import arcjet, { tokenBucket } from "@arcjet/next";

const aj=arcjet({
    key:process.env.ARCJET_API_KEY,
    characteristics:["userId"], //track based on clerk id
    rules:[
        tokenBucket({
            mode:"LIVE",
            refillRate:10,
            interval:3600,
            capacity:10,
        })
    ]
});

export default aj;