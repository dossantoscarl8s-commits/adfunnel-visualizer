export type MetaSettings = {
  permanent_token?: string;
  temp_token?: string;
  api_version?: string;
  business_id?: string;
};

export type AiSettings = {
  model?: string;
  temperature?: number;
  system_prompt?: string;
  auto_insights?: boolean;
};

export type WhatsappSettings = {
  phone_number_id?: string;
  waba_id?: string;
  access_token?: string;
  verify_token?: string;
  app_secret?: string;
};

export type Appearance = {
  brand_name: string;
  logo_url: string;
  accent: string;
  density: "compact" | "comfortable";
};

export type OverviewConfig = {
  kpis: string[];
  charts: string[];
};

export const DEFAULT_AI: AiSettings = {
  model: "google/gemini-3.7-flash",
  temperature: 0.3,
  system_prompt:
    "Você é um analista sênior de tráfego pago. Responda de forma direta, assertiva e baseada apenas nos números fornecidos. Sempre finalize com ações práticas priorizadas (escalar, otimizar, pausar).",
  auto_insights: true,
};

export const DEFAULT_APPEARANCE: Appearance = {
  brand_name: "Tráfego HQ",
  logo_url: "",
  accent: "teal",
  density: "comfortable",
};

export const KPI_CATALOG = [
  { id: "spend", label: "Investimento" },
  { id: "leads", label: "Leads" },
  { id: "cpl", label: "CPL" },
  { id: "impressions", label: "Impressões" },
  { id: "clicks", label: "Cliques" },
  { id: "ctr", label: "CTR" },
  { id: "cpm", label: "CPM" },
  { id: "cpc", label: "CPC" },
  { id: "conversations", label: "Conversas WhatsApp" },
] as const;

export const CHART_CATALOG = [
  { id: "spend_leads_trend", label: "Tendência: investimento x leads" },
  { id: "cpl_trend", label: "Tendência de CPL" },
  { id: "leads_by_unit", label: "Leads por unidade" },
  { id: "spend_by_unit", label: "Investimento por unidade" },
  { id: "cpl_by_unit", label: "CPL por unidade" },
  { id: "funnel", label: "Funil geral" },
  { id: "share_spend", label: "Participação de investimento" },
] as const;

export const DEFAULT_OVERVIEW: OverviewConfig = {
  kpis: ["spend", "leads", "cpl", "ctr", "impressions", "clicks"],
  charts: ["spend_leads_trend", "funnel", "leads_by_unit", "cpl_by_unit"],
};
