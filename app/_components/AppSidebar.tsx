import React from 'react'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
} from "@/components/ui/sidebar"
import {
    FileText,
    GraduationCap,
    LayoutDashboard,
    Map,
    MessageSquare,
    User,
} from "lucide-react"
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Resume Analyzer",
        url: "/ai-tools/resume-analyzer",
        icon: FileText,
    },
    {
        title: "Career Roadmap",
        url: "/ai-tools/ai-roadmap-agent",
        icon: Map,
    },
    {
        title: "AI Chatbot",
        url: "/ai-tools/ai-chat",
        icon: MessageSquare,
    },
    {
        title: "Alumni Network",
        url: "/alumni",
        icon: GraduationCap,
    },
    {
        title: "Profile",
        url: "/profile",
        icon: User,
    },
]

export function AppSidebar() {
    const path = usePathname();
    const isActive = (itemUrl: string) =>
        path === itemUrl || path.startsWith(`${itemUrl}/`);

    return (
        <Sidebar>
            <SidebarHeader>
                <div className='p-4'>
                    <Image src={'/new.png'} alt='logo' width={100} height={70}
                        className='w-full' />
                    <h2 className='text-sm text-gray-400 text-center mt-3'>Build Awesome Skills with the ai career navigator  </h2>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>

                    <SidebarGroupContent>
                        <SidebarMenu className='mt-2'>
                            {items.map((item, index) => (
                                <Link
                                    href={item.url}
                                    key={index}
                                    className={`p-2 text-lg flex gap-2 items-center rounded-lg transition-colors
                                    ${isActive(item.url) ? 'bg-gray-100 font-medium' : 'hover:bg-gray-100'}`}
                                >
                                    <item.icon className='h-5 w-5' />
                                    <span>{item.title}</span>
                                </Link>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <h2 className='p-2 text-gray-400 text-sm'>Copyright @xyz</h2>
            </SidebarFooter>
        </Sidebar>
    )
}