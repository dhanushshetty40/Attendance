import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const genAI = new GoogleGenerativeAI(API_KEY);

// Stub for the AI agent column mapping function to be built in Phase 4
export const getColumnMapping = async (headers, sampleData) => {
  console.log("Stub: Call Gemini API here", headers, sampleData);
  return null;
};
