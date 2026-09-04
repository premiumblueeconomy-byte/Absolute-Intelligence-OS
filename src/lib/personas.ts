import type { Persona } from "@/integrations/supabase/types";

export const PERSONAS: { id: Persona; label: string; blurb: string }[] = [
  { id: "explorer", label: "Explorer", blurb: "Students, learners, curious minds." },
  { id: "researcher", label: "Researcher", blurb: "Academics, scientists, postgraduate researchers." },
  { id: "entrepreneur", label: "Entrepreneur", blurb: "Founders, SMEs, innovators." },
  { id: "investor", label: "Investor", blurb: "Angels, VCs, family offices, DFIs." },
  { id: "consultant", label: "Consultant", blurb: "Strategy, technology, sustainability, innovation." },
  { id: "corporate", label: "Corporate", blurb: "New markets, products, technologies, adjacencies." },
  { id: "university", label: "University", blurb: "Higher-ed institutions and commercialization offices." },
  { id: "government", label: "Government", blurb: "National, state, provincial, city and local agencies." },
  { id: "development_organization", label: "Development Organization", blurb: "NGOs and multilateral institutions." },
  { id: "community_innovator", label: "Community Innovator", blurb: "Cooperatives and local development organizations." },
];

/** Default opportunity-score weights per persona (section 12 / 2 of the spec: "ranking weights"). */
export const PERSONA_WEIGHTS: Record<Persona, Record<string, number>> = {
  investor: {
    marketAttractiveness: 20, resourceAvailability: 5, technologyReadiness: 10, competitiveAdvantage: 12,
    financialAttractiveness: 25, executionFeasibility: 13, strategicImportance: 5, employmentPotential: 2,
    tradePotential: 3, regenerativeImpact: 5,
  },
  government: {
    marketAttractiveness: 10, resourceAvailability: 12, technologyReadiness: 8, competitiveAdvantage: 5,
    financialAttractiveness: 8, executionFeasibility: 10, strategicImportance: 15, employmentPotential: 17,
    tradePotential: 10, regenerativeImpact: 5,
  },
  development_organization: {
    marketAttractiveness: 8, resourceAvailability: 12, technologyReadiness: 8, competitiveAdvantage: 4,
    financialAttractiveness: 8, executionFeasibility: 12, strategicImportance: 10, employmentPotential: 18,
    tradePotential: 5, regenerativeImpact: 15,
  },
  community_innovator: {
    marketAttractiveness: 10, resourceAvailability: 15, technologyReadiness: 8, competitiveAdvantage: 5,
    financialAttractiveness: 10, executionFeasibility: 15, strategicImportance: 7, employmentPotential: 15,
    tradePotential: 5, regenerativeImpact: 10,
  },
  university: {
    marketAttractiveness: 10, resourceAvailability: 8, technologyReadiness: 18, competitiveAdvantage: 8,
    financialAttractiveness: 8, executionFeasibility: 8, strategicImportance: 12, employmentPotential: 8,
    tradePotential: 5, regenerativeImpact: 15,
  },
  researcher: {
    marketAttractiveness: 8, resourceAvailability: 8, technologyReadiness: 22, competitiveAdvantage: 7,
    financialAttractiveness: 5, executionFeasibility: 8, strategicImportance: 12, employmentPotential: 5,
    tradePotential: 5, regenerativeImpact: 20,
  },
  corporate: {
    marketAttractiveness: 18, resourceAvailability: 8, technologyReadiness: 10, competitiveAdvantage: 15,
    financialAttractiveness: 18, executionFeasibility: 12, strategicImportance: 10, employmentPotential: 3,
    tradePotential: 4, regenerativeImpact: 2,
  },
  consultant: {
    marketAttractiveness: 15, resourceAvailability: 10, technologyReadiness: 10, competitiveAdvantage: 10,
    financialAttractiveness: 15, executionFeasibility: 10, strategicImportance: 10, employmentPotential: 5,
    tradePotential: 5, regenerativeImpact: 10,
  },
  entrepreneur: {
    marketAttractiveness: 15, resourceAvailability: 10, technologyReadiness: 10, competitiveAdvantage: 10,
    financialAttractiveness: 15, executionFeasibility: 15, strategicImportance: 8, employmentPotential: 5,
    tradePotential: 4, regenerativeImpact: 8,
  },
  explorer: {
    marketAttractiveness: 15, resourceAvailability: 10, technologyReadiness: 10, competitiveAdvantage: 10,
    financialAttractiveness: 15, executionFeasibility: 10, strategicImportance: 10, employmentPotential: 5,
    tradePotential: 5, regenerativeImpact: 10,
  },
};
