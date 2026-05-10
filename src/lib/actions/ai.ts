'use server'

import { GoogleGenAI } from '@google/genai'
import { getMonthlyUsageData } from './reports'

// Initialize the Google Gen AI client
// It will automatically pick up the GEMINI_API_KEY environment variable.
const ai = new GoogleGenAI({})

export async function generateInventoryInsights(year: number, month: number) {
  try {
    // 1. Fetch the report data for the given month
    const result = await getMonthlyUsageData(year, month)

    if (result.error || !result.data) {
       return { error: result.error || 'Failed to fetch data for analysis.' }
    }

    const { totalUnitsIssued, totalUnitsInstalled, totalStockOnHand, stockDetails } = result.data

    // 2. Prepare the prompt for the AI model
    const prompt = `
      You are an expert inventory management analyst.
      Analyze the following inventory data for the month of ${month}/${year}.

      Summary:
      - Total Units Issued to Technicians: ${totalUnitsIssued}
      - Total Units Installed/Confirmed: ${totalUnitsInstalled}
      - Total Stock Remaining in Warehouse: ${totalStockOnHand}

      Stock Details (Category, Name, Quantity):
      ${stockDetails?.map(s => `- ${s.category}: ${s.name} (${s.quantity})`).join('\n')}

      Please provide a brief, professional 3-4 sentence insight report.
      Highlight any potential shortages, categories that seem overstocked, or discrepancies between issued and installed units that management should investigate.
    `

    // 3. Call the Gemini model using Google AI Studio
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })

    return { insight: response.text }
  } catch (error: any) {
    console.error('Error generating AI insights:', error)
    return { error: error.message }
  }
}
