
import React, { useEffect, useRef, useState } from "react";
import AppLayout from '../components/AppLayout';
import Card from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { getWeekDates, getCurrentMonthDates } from "@/utils/dateUtils";
import { format } from "date-fns";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
  Title,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { useAuth } from '../contexts/auth/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Title, Legend);

// Constants
const barColors = {
  tasks: "#1DA1F2",
  rules: "#F39C12",
  rewards: "#9B59B6",
  punishments: "#E74C3C",
};

// Tooltip Plugin
const customTooltip = {
  enabled: false,
  external: function (context: any) {
    const tooltipModel = context.tooltip;
    const chart = context.chart;
    let tooltipEl = document.getElementById("chartjs-tooltip");

    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.id = "chartjs-tooltip";
      tooltipEl.style.position = "absolute";
      tooltipEl.style.pointerEvents = "none";
      tooltipEl.style.color = "#fff";
      tooltipEl.style.fontSize = "0.75rem";
      tooltipEl.style.whiteSpace = "pre-line";
      tooltipEl.style.textAlign = "left";
      tooltipEl.style.background = "transparent";
      tooltipEl.style.border = "none";
      chart.canvas.parentNode.appendChild(tooltipEl);
    }

    if (tooltipModel.opacity === 0) {
      tooltipEl.style.opacity = "0";
      return;
    }

    if (tooltipModel.body) {
      const date = tooltipModel.title?.[0] || "";
      const lines = tooltipModel.body.map((b: any) => b.lines).flat();
      tooltipEl.innerHTML = `${date}\n${lines.join("\n")}`;
    }

    const position = chart.canvas.getBoundingClientRect();
    tooltipEl.style.opacity = "1";
    tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 10 + "px";
    tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + "px";
  },
};

// Helper: Empty data for each day
const initMetricMap = (dates: string[]) =>
  Object.fromEntries(
    dates.map((d) => [d, { tasks: 0, rules: 0, rewards: 0, punishments: 0 }])
  );

// Main Component
const ThroneRoom: React.FC = () => {
  const { user } = useAuth();
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [user]);

  const fetchMetrics = async () => {
    const { data: taskData } = await supabase
      .from("task_completion_history")
      .select("*");

    const { data: ruleData } = await supabase
      .from("rule_violations")
      .select("*");

    const { data: rewardData } = await supabase
      .from("reward_usage")
      .select("*");

    const { data: punishmentData } = await supabase
      .from("punishment_history")
      .select("*");

    const weeklyDates = getWeekDates();
    const monthlyDates = getCurrentMonthDates();
    const weekMap = initMetricMap(weeklyDates);
    const monthMap = initMetricMap(monthlyDates);

    for (const entry of taskData || []) {
      const date = format(new Date(entry.completed_at), "yyyy-MM-dd");
      if (weekMap[date]) weekMap[date].tasks++;
      if (monthMap[date]) monthMap[date].tasks++;
    }
    
    for (const entry of ruleData || []) {
      const date = format(new Date(entry.violation_date), "yyyy-MM-dd");
      if (weekMap[date]) weekMap[date].rules++;
      if (monthMap[date]) monthMap[date].rules++;
    }
    
    for (const entry of rewardData || []) {
      // Fix: Use created_at instead of redeemed_at since it doesn't exist
      const date = format(new Date(entry.created_at), "yyyy-MM-dd");
      if (weekMap[date]) weekMap[date].rewards++;
      if (monthMap[date]) monthMap[date].rewards++;
    }
    
    for (const entry of punishmentData || []) {
      // Fix: Use applied_date instead of applied_at
      const date = format(new Date(entry.applied_date), "yyyy-MM-dd");
      if (weekMap[date]) weekMap[date].punishments++;
      if (monthMap[date]) monthMap[date].punishments++;
    }

    setWeeklyData(weekMap);
    setMonthlyData(monthMap);
  };

  const renderChart = (dataSet: any, labels: string[], type: "weekly" | "monthly") => {
    return {
      labels,
      datasets: [
        {
          label: "Tasks Completed",
          data: labels.map((d) => dataSet?.[d]?.tasks || 0),
          backgroundColor: barColors.tasks,
        },
        {
          label: "Rules Broken",
          data: labels.map((d) => dataSet?.[d]?.rules || 0),
          backgroundColor: barColors.rules,
        },
        {
          label: "Rewards Redeemed",
          data: labels.map((d) => dataSet?.[d]?.rewards || 0),
          backgroundColor: barColors.rewards,
        },
        {
          label: "Punishments",
          data: labels.map((d) => dataSet?.[d]?.punishments || 0),
          backgroundColor: barColors.punishments,
        },
      ],
    };
  };

  const options = {
    responsive: true,
    interaction: { mode: "index" as const, intersect: false },
    plugins: { tooltip: customTooltip },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, color: "#fff" },
        min: 0,
        max: 5,
        grid: { color: "rgba(255,255,255,0.1)" },
      },
      x: {
        ticks: { color: "#fff" },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
    },
  };

  const weeklyLabels = Object.keys(weeklyData || {});
  const monthlyLabels = Object.keys(monthlyData || {});

  return (
    <AppLayout>
      <div className="p-4 space-y-6 animate-fade-in">
        <p className="text-nav-inactive mb-4">
          Welcome to your command center where you can track activities and manage your domain
        </p>
        
        {/* MONTHLY */}
        <Card title="Monthly Activity">
          <div className="overflow-x-auto px-2 pb-2">
            <Bar
              ref={chartRef}
              options={options}
              data={renderChart(monthlyData, monthlyLabels, "monthly")}
            />
          </div>
          <div className="flex justify-around text-sm mt-2 text-white/90">
            <span className="text-cyan-400">Tasks Completed</span>
            <span className="text-orange-400">Rules Broken</span>
            <span className="text-purple-400">Rewards Redeemed</span>
            <span className="text-red-400">Punishments</span>
          </div>
        </Card>

        {/* WEEKLY */}
        <Card title="Weekly Activity">
          <div className="px-2 pb-2">
            <Bar
              ref={chartRef}
              options={options}
              data={renderChart(weeklyData, weeklyLabels, "weekly")}
            />
          </div>
          <div className="flex justify-around text-sm mt-2 text-white/90">
            <span className="text-cyan-400">Tasks Completed</span>
            <span className="text-orange-400">Rules Broken</span>
            <span className="text-purple-400">Rewards Redeemed</span>
            <span className="text-red-400">Punishments</span>
          </div>
        </Card>

        {/* TILES */}
        <Card title="Activity Summary">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between px-4 py-2 bg-light-navy rounded-md text-cyan-400">
              <span>Tasks Completed:</span>
              <span>{weeklyData?.[weeklyLabels[weeklyLabels.length - 1]]?.tasks || 0}</span>
            </div>
            <div className="flex justify-between px-4 py-2 bg-light-navy rounded-md text-orange-400">
              <span>Rules Broken:</span>
              <span>{weeklyData?.[weeklyLabels[weeklyLabels.length - 1]]?.rules || 0}</span>
            </div>
            <div className="flex justify-between px-4 py-2 bg-light-navy rounded-md text-purple-400">
              <span>Rewards Redeemed:</span>
              <span>{weeklyData?.[weeklyLabels[weeklyLabels.length - 1]]?.rewards || 0}</span>
            </div>
            <div className="flex justify-between px-4 py-2 bg-light-navy rounded-md text-red-400">
              <span>Punishments:</span>
              <span>{weeklyData?.[weeklyLabels[weeklyLabels.length - 1]]?.punishments || 0}</span>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ThroneRoom;
