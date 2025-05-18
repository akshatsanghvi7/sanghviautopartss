'use server';

/**
 * @fileOverview This file defines a Genkit flow for categorizing a part based on its name and description.
 *
 * - categorizePart - A function that takes part name and description as input and returns the predicted category.
 * - CategorizePartInput - The input type for the categorizePart function.
 * - CategorizePartOutput - The return type for the categorizePart function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizePartInputSchema = z.object({
  partName: z.string().describe('The name of the part.'),
  partDescription: z.string().describe('A detailed description of the part.'),
});

export type CategorizePartInput = z.infer<typeof CategorizePartInputSchema>;

const CategorizePartOutputSchema = z.object({
  category: z.string().describe('The predicted category for the part.'),
  reasoning: z.string().describe('The reasoning behind the category prediction.'),
});

export type CategorizePartOutput = z.infer<typeof CategorizePartOutputSchema>;

export async function categorizePart(input: CategorizePartInput): Promise<CategorizePartOutput> {
  return categorizePartFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizePartPrompt',
  input: {schema: CategorizePartInputSchema},
  output: {schema: CategorizePartOutputSchema},
  prompt: `You are an expert in automotive parts categorization.
  Given the name and description of a part, you will predict the most appropriate category for it.
  You will also provide a brief reasoning for your prediction.

  Part Name: {{{partName}}}
  Part Description: {{{partDescription}}}

  Respond with a JSON object with 'category' and 'reasoning' fields.
  The category should be a single, concise word or phrase representing the part's category.
  The reasoning should briefly explain why you chose that category.
  `,
});

const categorizePartFlow = ai.defineFlow(
  {
    name: 'categorizePartFlow',
    inputSchema: CategorizePartInputSchema,
    outputSchema: CategorizePartOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
