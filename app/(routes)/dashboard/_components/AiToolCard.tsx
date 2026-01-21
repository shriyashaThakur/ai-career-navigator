import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
interface TOOL{
        name:string,
        desc:string,
        icon:string,
        button:string,
        path:string,
}

type AIToolsProps = { 
    tool : TOOL
}

function AiToolCard({tool}:AIToolsProps){
    return(
        <div className="p-3 border rounded-lg mg-4">
            <Image src={tool.icon} width={40} height={40} alt={tool.name}/>
            <h2 className="font-bold mt-2">{tool.name}</h2>
            <p className="text-gray-400">{tool.desc}</p>
            
            {/* ADD target="_blank" TO THE LINK */}
            <Link href={tool.path} target="_blank">  
              <Button className="w-full mt-3 bg-[#355ca9] hover:bg-[#1d4084] transition">{tool.button}</Button>
            </Link>

        </div>
    )
}
export default AiToolCard  