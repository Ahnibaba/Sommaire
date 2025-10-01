"use server"

import { getDbConnection } from "@/lib/db";
import { generateSummaryFromGemini } from "@/lib/geminiai";
import { fetchAndExtractPdfText } from "@/lib/langchain";
import { generateSummaryFromOpenAI } from "@/lib/openai";
import { auth } from "@clerk/nextjs/server";
import { formatFileNameAsTitle } from "../../utils/format-util";
import { revalidatePath } from "next/cache";

export interface UploadResponseProps {
  ufsUrl: string;
  name: string;
  serverData: {
    userId: string;
  }
}

interface PdfSummaryType {
  userId?: string;
  fileUrl: string;
  summary: string;
  title: string;
  fileName: string;
}

export async function generatePdfSummary(uploadResponse: UploadResponseProps[]) {
  if (!uploadResponse) {
    return { success: false, message: "File upload failed", data: null }
  }

  const { ufsUrl: pdfUrl, name: fileName, serverData: { userId } } = uploadResponse[0]

  if (!pdfUrl) {
    return { success: false, message: "File upload failed", data: null }
  }
  try {
    const pdfText = await fetchAndExtractPdfText(pdfUrl)
    console.log(pdfText);


    let summary
    try {
      summary = await generateSummaryFromOpenAI(pdfText)
      console.log(summary);

    } catch (error) {
      console.log(error);
      // Call Gemini
      if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
        try {
          summary = await generateSummaryFromGemini(pdfText)
        } catch (geminiError) {
          console.error("Gemini API failed after OpenAI quote exceeded", geminiError);
          throw new Error("Failed to generate summary with available AI providers")
        }
      }

    }

    if (!summary) {
      return { success: false, message: "Failed to generate Summary", data: null }
    }

    console.log(summary);

    const formattedFileName = formatFileNameAsTitle(fileName)

    return {
      success: true,
      message: "Summary generated successfully",
      data: {
        title: formattedFileName,
        summary
      }
    }
  } catch (error) {
    return { success: false, message: "File upload failed", data: null }
  }
}

async function savePdfSummary({ userId, fileUrl, summary, title, fileName }: PdfSummaryType) {
  // sql inserting pdf summary
  try {
    const sql = await getDbConnection()
    const [savedSummary] = await sql`
     INSERT INTO pdf_summaries (
       user_id,
       original_file_url,
       summary_text,
       title,
       file_name
     ) VALUES (
        ${userId},
        ${fileUrl},
        ${summary},
        ${title},
        ${fileName}
     )
        RETURNING *;
    `
    return savedSummary
  } catch (error) {
    console.error("Error saving PDF summary", error);
    throw error
  }
}

export async function storePdfSummaryActions({ userId, fileUrl, summary, title, fileName }: PdfSummaryType) {
  // user is logged in and as a userId
  // savePdfSummary
  // savedPdfSummary()

  let savedSummary
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        message: "User not found"
      }
    }
    savedSummary = await savePdfSummary({ userId, fileUrl, summary, title, fileName })
    console.log("IAMSAVEDSUMMARY", savedSummary);
    
    if (!savedSummary) {
      return {
        success: false,
        message: "Failed to save PDF summary, please try again..."
      }
    }

  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error saving PDF summary"
    }
  }

  // Revalidate our cache
  revalidatePath(`/summaries/${savedSummary?.id}`)

  return {
    success: true,
    message: "PDF summary saved successfully.",
    data: {
      id: savedSummary?.id
    }
  }
}