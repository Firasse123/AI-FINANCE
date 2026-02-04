import { toast } from "sonner";
import { useState } from "react";
const useFetch=(cb)=>{
    const [data,setData]=useState(undefined);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(null);

    const fn=async(...args)=>{
        setLoading(true);
        setError(null);

        try{
            const response=await cb(...args);
            setData(response);
            setError(null);

        }
        catch(error){
            setError(error);
            toast.error(error.message || "An error occurred");

        }
        finally{
            setLoading(false);
        }


    }
    return [data,loading,error,fn,setData]
}
export default useFetch;