import { Button } from "@/components/ui/button"
import React from "react"

function WelcomeBanner() {
    return(
        <div className="p-5 bg-gradient-to-tr from-[#1d4084] via-[#355ca9] to-[#f48322] rounded-xl">
            <h2 className="font-bold text-2xl text-white">AI Career Navigator </h2>
            <p className="text-white">Smart career disicion starts here - Get tailored advice, resume analyser and a roadmap built just for you with power of AI.</p>
            <Button variant={"outline"} className="mt-3 bg-white hover:bg-[#f0f0f0] transition">Let's Get Started</Button>
        </div>
    )
}

export default WelcomeBanner
