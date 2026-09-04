import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { DIMENSION_LABEL, type ScoreDimensions } from "@/lib/scoring";

export function ScoreRadar({ dims }: { dims: ScoreDimensions }) {
  const data = (Object.keys(DIMENSION_LABEL) as (keyof ScoreDimensions)[]).map((key) => ({
    dimension: DIMENSION_LABEL[key].replace(" / ", "/"),
    value: dims[key],
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="value" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.25} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
