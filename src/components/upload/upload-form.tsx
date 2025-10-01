"use client"
import React, { useRef, useState } from "react";
import UploadFormInput from "./upload-form-input";
import z from "zod";
import { useUploadThing } from "../../../utils/upload-thing";
import { toast } from "sonner";
import { generatePdfSummary, storePdfSummaryActions } from "@/actions/upload-actions";
import { useRouter } from "next/navigation";

// Schema with zod
const schema = z.object({
    file: z.instanceof(File, { message: "Invalid file" })
        .refine((file) => file.size <= 20 * 1024 * 1024, { message: "File size must be less than 20MB" })
        .refine((file) => file.type.startsWith("application/pdf"), { message: "File must be a PDF" })
})


export default function UploadForm() {
    const formRef = useRef<HTMLFormElement>(null)
    const [isLoading, setIsLoading] = useState(false)

    const router = useRouter()


    const { startUpload, routeConfig } = useUploadThing
        ("pdfUploader", {
            onClientUploadComplete: () => {
                console.log("uploaded successfully");

            },
            onUploadError: (err) => {
                console.error("error occured while uploading", err);
                toast("Error occured while uploading", {
                    description: err.message,
                    action: {
                        label: "close",
                        onClick: () => { }
                    }
                })

            },
            onUploadBegin: (file) => {
                console.log("upload has begun for", file);
            }
        })

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()


        try {
            setIsLoading(true)
            const formData = new FormData(e.currentTarget)
            const file = formData.get("file") as File
            console.log(file);


            // Validating the fields
            const validatedFields = schema.safeParse({ file })

            console.log(validatedFields);


            if (!validatedFields.success) {
                console.log(validatedFields);

                const error = validatedFields.error.issues[0].message

                console.log(error);

                toast.error("Something went wrong", {
                    description: error,
                    action: {
                        label: "close",
                        onClick: () => { }
                    }

                })
                setIsLoading(false)
                return;
            }

            toast.success("📄 Uploading PDF", {
                description: "We are uploading your PDF!",
                action: {
                    label: "close",
                    onClick: () => { }
                }
            })


            // Upload the file to uploadthing
            const resp = await startUpload([file])
            if (!resp) {
                toast.error("Something went wrong", {
                    description: "Please use a different file",
                    action: {
                        label: "close",
                        onClick: () => { }
                    }
                })
                setIsLoading(false)
                return
            }
            console.log(resp);


            toast.success("📄 Processing PDF", {
                description: "Hang tight: Our AI is reading through your document ✨",
                action: {
                    label: "close",
                    onClick: () => { }
                }
            })
            // Parse the pdf using lang chain
            // Summarize the pdf using AI
            const result = await generatePdfSummary(resp)

            const { data = null, message = null } = result || {}

            if (data) {
                let storeResult: any
                toast.success("📄 Saving PDF", {
                    description: "Hang tight: We are saving your summary! ✨",
                    action: {
                        label: "close",
                        onClick: () => { }
                    }
                })

                if (data.summary) {
                    //save the summary to the database
                    storeResult = await storePdfSummaryActions({
                        summary: data.summary,
                        fileUrl: resp[0].ufsUrl,
                        title: data.title,
                        fileName: file.name
                    })

                    console.log("IAMSTORERESULT", storeResult);


                    toast.success("✨ Summary Generated", {
                        description: "Your summary has been successfully summarized and saved ✨",
                        action: {
                            label: "close",
                            onClick: () => { }
                        }
                    })

                    formRef.current?.reset()

                    // redirect to the [id] summary page 
                    router.push(`/summaries/${storeResult.data.id}`)


                }
            }



        } catch (error) {
            setIsLoading(false)
            console.error(error);
            formRef.current?.reset()

        } finally {
            setIsLoading(false)
        }


    }
    return (
        <div className="flex flex-col gap-8 w-full max-w-2xl">
            <UploadFormInput
                isLoading={isLoading}
                onSubmit={handleSubmit}
                ref={formRef}
            />
        </div>
    )
}