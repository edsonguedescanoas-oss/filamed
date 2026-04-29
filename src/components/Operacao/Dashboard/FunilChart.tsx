import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';

interface FunnelData {
  stage: string;
  count: number;
  conversion: string;
}

interface FunilChartProps {
  data: FunnelData[];
}

const COLORS = ['#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#082f49'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-xs">
        <p className="font-bold mb-1">{data.stage}</p>
        <p className="text-muted-foreground">Leads: <span className="text-foreground font-semibold">{data.count}</span></p>
        <p className="text-muted-foreground text-[10px] mt-1 italic">Taxa de conversão: {data.conversion}</p>
      </div>
    );
  }
  return null;
};

const FunilChart: React.FC<FunilChartProps> = ({ data }) => {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2} />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="stage" 
            type="category" 
            tick={{ fontSize: 11, fontWeight: 500 }}
            width={120}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={35}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
            <LabelList 
              dataKey="count" 
              position="right" 
              style={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} 
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FunilChart;
