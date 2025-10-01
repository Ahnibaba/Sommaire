import BgGradient from "@/components/common/bg-gradient"
import { getSummaryById } from "@/lib/summaries"
import { notFound } from "next/navigation"


export default async function SummaryPage({ params }: { params: { id: string } }) {
    const id = await params.id
    
    const summary = await getSummaryById(id)

    if (!summary) {
        notFound()
    //   return <div className="">Summary not found</div>
    }

    const { title, summary_text, file_name } = summary

    return (
    <div className="relative isolate min-h-screen bg-linear-to-b
    from-rose-50/40 to-white">
      <BgGradient className="from-rose-400 via-rose-300 to-orange-200" /> 

      <div className="container mx-auto flex flex-col gap-4">
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-24">
           <div className="flex flex-col">
              <h1 className="">{title}</h1>
           </div>
           {file_name && <p>{file_name}</p>}
        </div>
      </div>  
    </div>
  )
}