"use client";

import * as echarts from "echarts";
import { useEffect, useRef } from "react";

import type {
  DashboardMetric,
  DashboardMonthlyTrend,
  DashboardOwnerMetric,
} from "@/lib/dashboard-contract";
import type {
  ClosingRateOwnerMetric,
  PamAnnualPreLeadPoint,
  PamDigitalParticipationPoint,
  PerformanceMetric,
} from "@/lib/rendimiento-contract";

const TYPE_REGISTRY_COLORS = [
  "#1f6f5f",
  "#2f5f9e",
  "#c46b1f",
  "#8c3b72",
  "#5f8f1f",
  "#6a46c7",
  "#c23b3b",
  "#1f7f8c",
];

type DashboardChartProps = {
  ariaLabel: string;
  data: DashboardMetric[];
  emptyMessage: string;
};

export function DashboardChart({ ariaLabel, data, emptyMessage }: DashboardChartProps) {
  const chartElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = chartElement.current;
    if (!element) return;

    const chart = echarts.init(element, undefined, { renderer: "svg" });
    const labels = data.map((item) => item.nombre).reverse();
    const values = data.map((item) => item.total).reverse();

    chart.setOption({
      animationDuration: 420,
      animationEasing: "cubicOut",
      grid: { top: 10, right: 28, bottom: 4, left: 12, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: echarts.TooltipComponentFormatterCallbackParams) => {
          const point = Array.isArray(params) ? params[0] : params;
          return `${point.name}: <strong>${point.value}</strong>`;
        },
      },
      xAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#e7e7e7" } },
        axisLabel: { color: "#737373", fontSize: 10 },
      },
      yAxis: {
        type: "category",
        data: labels,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          color: "#404040",
          fontSize: 11,
          width: 138,
          overflow: "truncate",
        },
      },
      series: [
        {
          type: "bar",
          data: values,
          barMaxWidth: 20,
          itemStyle: { color: "#525252", borderRadius: [0, 3, 3, 0] },
          label: {
            show: true,
            position: "right",
            color: "#404040",
            fontFamily: "Nunito Sans, sans-serif",
            fontSize: 10,
          },
        },
      ],
      graphic: data.length
        ? undefined
        : {
            type: "text",
            left: "center",
            top: "middle",
            style: { text: emptyMessage, fill: "#737373", fontSize: 12 },
          },
    });

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [data, emptyMessage]);

  return <div ref={chartElement} className="dashboard-chart" role="img" aria-label={ariaLabel} />;
}

type DashboardPieChartProps = {
  abiertas: number;
  cerradas: number;
};

export function DashboardPieChart({ abiertas, cerradas }: DashboardPieChartProps) {
  const chartElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = chartElement.current;
    if (!element) return;

    const chart = echarts.init(element, undefined, { renderer: "svg" });
    const total = abiertas + cerradas;

    chart.setOption({
      animationDuration: 480,
      animationEasing: "cubicOut",
      color: ["#4a7c62", "#a3a3a3"],
      tooltip: {
        trigger: "item",
        formatter: "{b}: <strong>{c}</strong> ({d}%)",
      },
      legend: {
        bottom: 4,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: "#525252", fontSize: 11 },
      },
      series: [
        {
          type: "pie",
          radius: "64%",
          center: ["50%", "43%"],
          avoidLabelOverlap: true,
          label: {
            show: total > 0,
            formatter: "{b}\n{c} · {d}%",
            color: "#404040",
            fontFamily: "Nunito Sans, sans-serif",
            fontSize: 10,
            lineHeight: 15,
          },
          labelLine: { length: 8, length2: 6, lineStyle: { color: "#a3a3a3" } },
          data: [
            { name: "Abiertas", value: abiertas },
            { name: "Cerradas", value: cerradas },
          ],
        },
      ],
      graphic: total
        ? undefined
        : {
            type: "text",
            left: "center",
            top: "middle",
            style: { text: "No hay oportunidades", fill: "#737373", fontSize: 12 },
          },
    });

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [abiertas, cerradas]);

  return (
    <div
      ref={chartElement}
      className="dashboard-chart dashboard-chart--pie"
      role="img"
      aria-label={`${abiertas} oportunidades abiertas y ${cerradas} cerradas`}
    />
  );
}

type DashboardOwnerChartProps = {
  data: DashboardOwnerMetric[];
};

export function DashboardOwnerChart({ data }: DashboardOwnerChartProps) {
  const chartElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = chartElement.current;
    if (!element) return;

    const chart = echarts.init(element, undefined, { renderer: "svg" });
    const owners = [...data].reverse();

    chart.setOption({
      animationDuration: 420,
      animationEasing: "cubicOut",
      color: ["#4a7c62", "#a3a3a3"],
      grid: { top: 38, right: 28, bottom: 4, left: 12, containLabel: true },
      legend: {
        top: 5,
        right: 12,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: "#525252", fontSize: 11 },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      xAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#e7e7e7" } },
        axisLabel: { color: "#737373", fontSize: 10 },
      },
      yAxis: {
        type: "category",
        data: owners.map((owner) => owner.nombre),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: "#404040", fontSize: 11, width: 138, overflow: "truncate" },
      },
      series: [
        {
          name: "Abiertas",
          type: "bar",
          stack: "total",
          barMaxWidth: 22,
          itemStyle: { color: "#4a7c62", borderRadius: [3, 0, 0, 3] },
          label: { show: true, position: "inside", color: "#ffffff", fontSize: 10 },
          data: owners.map((owner) => ({
            value: owner.abiertas,
            label: { show: owner.abiertas > 0 },
          })),
        },
        {
          name: "Cerradas",
          type: "bar",
          stack: "total",
          barMaxWidth: 22,
          itemStyle: { color: "#a3a3a3", borderRadius: [0, 3, 3, 0] },
          label: { show: true, position: "inside", color: "#262626", fontSize: 10 },
          data: owners.map((owner) => ({
            value: owner.cerradas,
            label: { show: owner.cerradas > 0 },
          })),
        },
      ],
      graphic: data.length
        ? undefined
        : {
            type: "text",
            left: "center",
            top: "middle",
            style: { text: "No hay propietarios para este período", fill: "#737373", fontSize: 12 },
          },
    });

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [data]);

  return (
    <div
      ref={chartElement}
      className="dashboard-chart"
      role="img"
      aria-label="Gráfico de oportunidades abiertas y cerradas por propietario"
    />
  );
}

type DashboardTrendChartProps = {
  data: DashboardMonthlyTrend[];
};

const shortPeriodFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

function formatTrendPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  return shortPeriodFormatter.format(new Date(Date.UTC(year, month - 1, 1))).replace(".", "");
}

function formatShortPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  return shortPeriodFormatter.format(new Date(Date.UTC(year, month - 1, 1))).replace(".", "");
}

export function DashboardTrendChart({ data }: DashboardTrendChartProps) {
  const chartElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = chartElement.current;
    if (!element) return;

    const chart = echarts.init(element, undefined, { renderer: "svg" });

    const registryTypes = [...new Set(data.flatMap((month) => Object.keys(month.porTipoRegistro)))]
      .map((name) => ({
        name,
        total: data.reduce((sum, month) => sum + (month.porTipoRegistro[name] ?? 0), 0),
      }))
      .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name, "es"));

    chart.setOption({
      animationDuration: 520,
      animationEasing: "cubicOut",
      color: ["#4a7c62", "#a3a3a3", "#262626"],
      grid: { top: 42, right: 24, bottom: 18, left: 12, containLabel: true },
      legend: {
        type: "scroll",
        top: 6,
        left: 8,
        right: 12,
        itemWidth: 12,
        itemHeight: 8,
        textStyle: { color: "#525252", fontSize: 11 },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line", lineStyle: { color: "#a3a3a3" } },
        formatter: (params: echarts.TooltipComponentFormatterCallbackParams) => {
          const points = Array.isArray(params) ? params : [params];
          const details = points
            .map((point) => `${point.marker} ${point.seriesName}: <strong>${point.value}</strong>`)
            .join("<br />");
          return `${points[0].name}<br />${details}`;
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: true,
        data: data.map((month) => formatTrendPeriod(month.periodo)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#d4d4d4" } },
        axisLabel: { color: "#737373", fontSize: 10, hideOverlap: true },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#e7e7e7" } },
        axisLabel: { color: "#737373", fontSize: 10 },
      },
      series: [
        {
          name: "Abiertas",
          type: "bar",
          stack: "estado",
          barMaxWidth: 24,
          itemStyle: { color: "#4a7c62", borderRadius: [3, 3, 0, 0] },
          label: {
            show: data.length <= 12,
            position: "inside",
            color: "#ffffff",
            fontSize: 9,
          },
          data: data.map((month) => ({
            value: month.abiertas,
            label: { show: data.length <= 12 && month.abiertas > 0 },
          })),
          z: 1,
        },
        {
          name: "Cerradas",
          type: "bar",
          stack: "estado",
          barMaxWidth: 24,
          itemStyle: { color: "#a3a3a3", borderRadius: [3, 3, 0, 0] },
          label: {
            show: data.length <= 12,
            position: "inside",
            color: "#262626",
            fontSize: 9,
          },
          data: data.map((month) => ({
            value: month.cerradas,
            label: { show: data.length <= 12 && month.cerradas > 0 },
          })),
          z: 1,
        },
        {
          name: "Total ingresadas",
          type: "line",
          data: data.map((month) => month.total),
          smooth: 0.18,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 2, color: "#525252" },
          itemStyle: { color: "#525252", borderColor: "#ffffff", borderWidth: 2 },
          label: {
            show: data.length <= 18,
            position: "top",
            color: "#404040",
            fontFamily: "Nunito Sans, sans-serif",
            fontSize: 9,
          },
          z: 3,
        },
        ...registryTypes.map((registryType, index) => ({
          name: registryType.name,
          type: "line" as const,
          data: data.map((month) => month.porTipoRegistro[registryType.name] ?? 0),
          smooth: 0.12,
          symbol: "diamond",
          symbolSize: 5,
          lineStyle: {
            width: 1.5,
            type: "dashed" as const,
            color: TYPE_REGISTRY_COLORS[index % TYPE_REGISTRY_COLORS.length],
          },
          itemStyle: {
            color: TYPE_REGISTRY_COLORS[index % TYPE_REGISTRY_COLORS.length],
          },
          z: 4,
        })),
      ],
      graphic: data.length
        ? undefined
        : {
            type: "text",
            left: "center",
            top: "middle",
            style: { text: "No hay oportunidades con fecha de creación", fill: "#737373", fontSize: 12 },
          },
    });

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [data]);

  return (
    <div
      ref={chartElement}
      className="dashboard-chart dashboard-chart--global"
      role="img"
      aria-label="Gráfico combinado de oportunidades totales, abiertas, cerradas y por tipo de registro por mes"
    />
  );
}

type DashboardCategoryPieChartProps = {
  ariaLabel: string;
  colors?: string[];
  data: DashboardMetric[];
  emptyMessage?: string;
};

export function DashboardCategoryPieChart({
  ariaLabel,
  colors = TYPE_REGISTRY_COLORS,
  data,
  emptyMessage = "No hay datos disponibles",
}: DashboardCategoryPieChartProps) {
  const chartElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = chartElement.current;
    if (!element) return;

    const chart = echarts.init(element, undefined, { renderer: "svg" });
    const hasValues = data.some((item) => item.total > 0);

    chart.setOption({
      animationDuration: 480,
      animationEasing: "cubicOut",
      color: colors,
      tooltip: {
        trigger: "item",
        formatter: "{b}: <strong>{c}</strong> ({d}%)",
      },
      legend: {
        type: "scroll",
        bottom: 3,
        left: 8,
        right: 8,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: "#525252", fontSize: 10 },
      },
      series: [
        {
          type: "pie",
          radius: ["30%", "64%"],
          center: ["50%", "42%"],
          avoidLabelOverlap: true,
          minShowLabelAngle: 7,
          label: {
            formatter: "{b}\n{c}",
            color: "#404040",
            fontSize: 9,
            lineHeight: 13,
          },
          labelLine: { length: 7, length2: 5 },
          data: data.map((item) => ({ name: item.nombre, value: item.total })),
        },
      ],
      graphic: hasValues
        ? undefined
        : {
            type: "text",
            left: "center",
            top: "middle",
            style: { text: emptyMessage, fill: "#737373", fontSize: 12 },
          },
    });

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [colors, data, emptyMessage]);

  return (
    <div
      ref={chartElement}
      className="dashboard-chart dashboard-chart--treemap"
      role="img"
      aria-label={ariaLabel}
    />
  );
}

type PamRegistryStackedBarChartProps = {
  ariaLabel: string;
  data: DashboardMetric[];
  emptyMessage?: string;
};

export function PamRegistryStackedBarChart({
  ariaLabel,
  data,
  emptyMessage = "No hay oportunidades para este período",
}: PamRegistryStackedBarChartProps) {
  const chartElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = chartElement.current;
    if (!element) return;

    const chart = echarts.init(element, undefined, { renderer: "svg" });
    const sortedData = [...data].sort(
      (left, right) => right.total - left.total || left.nombre.localeCompare(right.nombre, "es"),
    );
    const total = sortedData.reduce((sum, item) => sum + item.total, 0);
    const hasValues = total > 0;
    const seriesColors = sortedData.map(
      (_, index) => TYPE_REGISTRY_COLORS[index % TYPE_REGISTRY_COLORS.length],
    );

    chart.setOption({
      animationDuration: 480,
      animationEasing: "cubicOut",
      color: seriesColors,
      grid: { top: 18, right: 24, bottom: 20, left: 24, containLabel: true },
      tooltip: {
        trigger: "item",
        formatter: (params: {
          data?: { rawValue?: number; percentValue?: number };
          name?: string;
          seriesName?: string;
        }) => {
          const rawValue = params.data?.rawValue ?? 0;
          const percentValue = params.data?.percentValue ?? 0;
          const label = params.seriesName || params.name || "Sin tipo de registro";
          return `${label}: <strong>${rawValue}</strong> (${percentValue.toFixed(2)}%)`;
        },
      },
      xAxis: {
        type: "category",
        data: [""],
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#d4d4d4" } },
        axisLabel: {
          color: "#737373",
          fontSize: 10,
        },
      },
      yAxis: {
        type: "value",
        max: 100,
        splitNumber: 5,
        axisLabel: {
          color: "#737373",
          fontSize: 10,
          formatter: (value: number) => `${value}%`,
        },
        splitLine: { lineStyle: { color: "#e7e7e7" } },
      },
      series: [
        ...sortedData.map((item, index) => {
          const percentValue = total > 0 ? (item.total / total) * 100 : 0;
          const showInside = percentValue >= 9;
          const seriesColor = seriesColors[index] ?? TYPE_REGISTRY_COLORS[index % TYPE_REGISTRY_COLORS.length];

          return {
            name: item.nombre,
            color: seriesColor,
            type: "bar" as const,
            stack: "total",
            barWidth: "80%",
            data: [
              {
                value: percentValue,
                rawValue: item.total,
                percentValue,
                itemStyle: {
                  color: seriesColor,
                  borderRadius:
                    index === 0
                      ? [4, 4, 0, 0]
                      : index === sortedData.length - 1
                        ? [0, 0, 4, 4]
                        : 0,
                },
                label: {
                  show: hasValues,
                  position: showInside ? "inside" : "top",
                  distance: showInside ? 0 : 10,
                  color: showInside ? "#ffffff" : "#404040",
                  fontFamily: "Nunito Sans, sans-serif",
                  fontSize: showInside ? 10 : 9,
                  fontWeight: 700,
                  lineHeight: showInside ? 13 : 12,
                  backgroundColor: showInside ? "transparent" : "rgba(255,255,255,0.92)",
                  borderRadius: showInside ? 0 : 4,
                  padding: showInside ? 0 : [2, 4],
                  formatter: () => `${item.nombre}\n${item.total} ${percentValue.toFixed(1)}%`,
                },
              },
            ],
            emphasis: { focus: "series" },
            z: 3 + index,
          };
        }),
        {
          name: "Referencia",
          type: "bar",
          stack: "total",
          silent: true,
          barWidth: "80%",
          itemStyle: {
            color: "transparent",
          },
          data: [0],
          z: 1,
        },
      ],
      legend: {
        type: "scroll",
        bottom: 2,
        left: 8,
        right: 8,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: "#525252", fontSize: 10 },
      },
      graphic: hasValues
        ? undefined
        : {
            type: "text",
            left: "center",
            top: "middle",
            style: { text: emptyMessage, fill: "#737373", fontSize: 12 },
          },
    });

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [data, emptyMessage]);

  return (
    <div
      ref={chartElement}
      className="dashboard-chart dashboard-chart--pam-breakdown"
      role="img"
      aria-label={ariaLabel}
    />
  );
}

type DashboardTreemapChartProps = {
  ariaLabel: string;
  data: DashboardMetric[];
  emptyMessage: string;
};

export function DashboardTreemapChart({
  ariaLabel,
  data,
  emptyMessage,
}: DashboardTreemapChartProps) {
  const chartElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = chartElement.current;
    if (!element) return;

    const chart = echarts.init(element, undefined, { renderer: "svg" });

    chart.setOption({
      animationDuration: 480,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "item",
        formatter: "{b}: <strong>{c}</strong> oportunidades",
      },
      series: [
        {
          type: "treemap",
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          sort: "desc",
          visibleMin: 4,
          color: ["#303030", "#454545", "#5a5a5a", "#6f6f6f", "#596f63", "#858585"],
          colorMappingBy: "index",
          label: {
            show: true,
            formatter: "{b}\n{c}",
            color: "#ffffff",
            fontFamily: "Nunito Sans, sans-serif",
            fontSize: 11,
            lineHeight: 16,
            overflow: "truncate",
          },
          upperLabel: { show: false },
          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 2,
            gapWidth: 2,
          },
          data: data.map((item) => ({ name: item.nombre, value: item.total })),
        },
      ],
      graphic: data.length
        ? undefined
        : {
            type: "text",
            left: "center",
            top: "middle",
            style: { text: emptyMessage, fill: "#737373", fontSize: 12 },
          },
    });

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [data, emptyMessage]);

  return (
    <div
      ref={chartElement}
      className="dashboard-chart dashboard-chart--treemap"
      role="img"
      aria-label={ariaLabel}
    />
  );
}

type PamAnnualPreLeadChartProps = {
  ariaLabel: string;
  data: PamAnnualPreLeadPoint[];
};

export function PamAnnualPreLeadChart({
  ariaLabel,
  data,
}: PamAnnualPreLeadChartProps) {
  const chartElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = chartElement.current;
    if (!element) return;

    const chart = echarts.init(element, undefined, { renderer: "svg" });
    const registryTypes = [...new Set(data.flatMap((month) => Object.keys(month.porTipoRegistro)))]
      .map((name) => ({
        name,
        total: data.reduce((sum, month) => sum + (month.porTipoRegistro[name] ?? 0), 0),
      }))
      .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name, "es"));

    chart.setOption({
      animationDuration: 520,
      animationEasing: "cubicOut",
      color: TYPE_REGISTRY_COLORS,
      grid: { top: 58, right: 24, bottom: 18, left: 12, containLabel: true },
      legend: {
        type: "scroll",
        top: 6,
        left: 8,
        right: 12,
        itemWidth: 12,
        itemHeight: 8,
        textStyle: { color: "#525252", fontSize: 11 },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line", lineStyle: { color: "#a3a3a3" } },
        formatter: (params: echarts.TooltipComponentFormatterCallbackParams) => {
          const points = Array.isArray(params) ? params : [params];
          const details = points
            .map((point) => `${point.marker} ${point.seriesName}: <strong>${point.value}</strong>`)
            .join("<br />");
          return `${points[0].name}<br />${details}`;
        },
      },
      xAxis: {
        type: "category",
        data: data.map((month) => formatShortPeriod(month.periodo)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#d4d4d4" } },
        axisLabel: { color: "#737373", fontSize: 10, hideOverlap: true },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#e7e7e7" } },
        axisLabel: { color: "#737373", fontSize: 10 },
      },
      series: registryTypes.map((registryType, index) => ({
        name: registryType.name,
        type: "line" as const,
        data: data.map((month) => month.porTipoRegistro[registryType.name] ?? 0),
        smooth: 0.14,
        symbol: "circle",
        symbolSize: 9,
        lineStyle: {
          width: 3.5,
          color: TYPE_REGISTRY_COLORS[index % TYPE_REGISTRY_COLORS.length],
        },
        itemStyle: {
          color: TYPE_REGISTRY_COLORS[index % TYPE_REGISTRY_COLORS.length],
          borderColor: "#ffffff",
          borderWidth: 2,
        },
        label: {
          show: true,
          position: "top",
          distance: 8,
          formatter: ({ value }: { value?: number | string | (number | string)[] }) => {
            const currentValue = Array.isArray(value) ? Number(value[1] ?? value[0] ?? 0) : Number(value ?? 0);
            return String(currentValue);
          },
          color: "#1f1f1f",
          fontFamily: "Nunito Sans, sans-serif",
          fontSize: 10,
          fontWeight: 700,
          backgroundColor: "rgba(255,255,255,0.86)",
          borderRadius: 4,
          padding: [2, 4],
        },
        labelLayout: {
          hideOverlap: true,
          moveOverlap: "shiftY",
        },
        emphasis: {
          focus: "series",
          lineStyle: {
            width: 4.5,
          },
          itemStyle: {
            borderWidth: 2.5,
          },
        },
      })),
      graphic: registryTypes.length
        ? undefined
        : {
            type: "text",
            left: "center",
            top: "middle",
            style: { text: "No hay pre leads para el año seleccionado", fill: "#737373", fontSize: 12 },
          },
    });

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [data]);

  return (
    <div
      ref={chartElement}
      className="dashboard-chart dashboard-chart--global"
      role="img"
      aria-label={ariaLabel}
    />
  );
}

type PamDigitalParticipationChartProps = {
  ariaLabel: string;
  data: PamDigitalParticipationPoint[];
};

export function PamDigitalParticipationChart({
  ariaLabel,
  data,
}: PamDigitalParticipationChartProps) {
  const chartElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = chartElement.current;
    if (!element) return;

    const chart = echarts.init(element, undefined, { renderer: "svg" });
    const registryTypes = [...new Set(data.flatMap((month) => Object.keys(month.porTipoRegistro)))]
      .map((name) => ({
        name,
        total: data.reduce(
          (sum, month) => sum + (month.porTipoRegistro[name]?.ventasTotales ?? 0),
          0,
        ),
      }))
      .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name, "es"));
    const hasValues = registryTypes.length > 0;
    const maxParticipation = Math.max(
      ...data.flatMap((month) =>
        registryTypes.map((registryType) => month.porTipoRegistro[registryType.name]?.participacion ?? 0),
      ),
      0,
    );
    const normalizedMaxParticipation = Math.min(
      1,
      Math.max(0.05, Math.ceil(maxParticipation / 0.05) * 0.05 + 0.05),
    );

    chart.setOption({
      animationDuration: 520,
      animationEasing: "cubicOut",
      color: ["#4f7d68", "#1f6f5f", "#2f5f9e"],
      grid: { top: 34, right: 42, bottom: 18, left: 12, containLabel: true },
      legend: {
        top: 4,
        right: 12,
        itemWidth: 12,
        itemHeight: 8,
        textStyle: { color: "#525252", fontSize: 11 },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line", lineStyle: { color: "#a3a3a3" } },
        formatter: (params: echarts.TooltipComponentFormatterCallbackParams) => {
          const rows = Array.isArray(params) ? params : [params];
          const title = String(rows[0]?.name ?? "");
          const details = rows
            .map((row) => {
              const value = Array.isArray(row.value) ? row.value[1] : row.value;
              const formattedValue = `${(Number(value ?? 0) * 100).toFixed(2)}%`;
              return `${row.marker} ${row.seriesName}: <strong>${formattedValue}</strong>`;
            })
            .join("<br />");
          return `${title}<br />${details}`;
        },
      },
      xAxis: {
        type: "category",
        data: data.map((month) => formatShortPeriod(month.periodo)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#d4d4d4" } },
        axisLabel: { color: "#737373", fontSize: 10, hideOverlap: true },
      },
      yAxis: [
        {
          type: "value",
          min: 0,
          max: normalizedMaxParticipation,
          splitLine: { lineStyle: { color: "#e7e7e7" } },
          axisLabel: {
            color: "#737373",
            fontSize: 10,
            formatter: (value: number) => `${(value * 100).toFixed(0)}%`,
          },
        },
      ],
      series: registryTypes.map((registryType, index) => ({
          name: registryType.name,
          type: "line",
          smooth: 0.16,
          symbol: "circle",
          symbolSize: 8,
          lineStyle: {
            width: 3,
            color: TYPE_REGISTRY_COLORS[index % TYPE_REGISTRY_COLORS.length],
          },
          itemStyle: {
            color: TYPE_REGISTRY_COLORS[index % TYPE_REGISTRY_COLORS.length],
            borderColor: "#ffffff",
            borderWidth: 2,
          },
          label: {
            show: true,
            position: "top",
            distance: 8,
            formatter: ({ value }: { value?: number | string | (number | string)[] }) => {
              const currentValue = Array.isArray(value)
                ? Number(value[1] ?? value[0] ?? 0)
                : Number(value ?? 0);
              return `${(currentValue * 100).toFixed(2)}%`;
            },
            color: "#2f2f2f",
            fontFamily: "Nunito Sans, sans-serif",
            fontSize: 9,
            fontWeight: 700,
            backgroundColor: "rgba(255,255,255,0.88)",
            borderRadius: 4,
            padding: [2, 4],
          },
          labelLayout: {
            hideOverlap: true,
            moveOverlap: "shiftY",
          },
          data: data.map((item) => item.porTipoRegistro[registryType.name]?.participacion ?? 0),
          z: 3 + index,
        })),
      graphic: hasValues
        ? undefined
        : {
            type: "text",
            left: "center",
            top: "middle",
            style: {
              text: "No hay oportunidades para el año seleccionado",
              fill: "#737373",
              fontSize: 12,
            },
          },
    });

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [data]);

  return (
    <div
      ref={chartElement}
      className="dashboard-chart dashboard-chart--digital-participation"
      role="img"
      aria-label={ariaLabel}
    />
  );
}

type PerformanceFunnelChartProps = {
  ariaLabel: string;
  color: string;
  maxValue: number;
  metric: PerformanceMetric;
};

export function PerformanceFunnelChart({
  ariaLabel,
  color,
  maxValue,
  metric,
}: PerformanceFunnelChartProps) {
  const chartElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = chartElement.current;
    if (!element) return;

    const chart = echarts.init(element, undefined, { renderer: "svg" });
    const normalizedData = [
      { name: "Pre Leads", value: maxValue > 0 ? metric.preLeads / maxValue : 0, rawValue: metric.preLeads },
      { name: "Leads", value: maxValue > 0 ? metric.leads / maxValue : 0, rawValue: metric.leads },
      { name: "Ventas", value: maxValue > 0 ? metric.ventas / maxValue : 0, rawValue: metric.ventas },
    ];
    const hasValues = normalizedData.some((item) => item.rawValue > 0);

    chart.setOption({
      animationDuration: 420,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "item",
        formatter: (params: { name?: string; data?: { rawValue?: number } }) =>
          `${params.name ?? ""}: <strong>${params.data?.rawValue ?? 0}</strong>`,
      },
      series: [
        {
          type: "funnel",
          left: "12%",
          top: 8,
          bottom: 8,
          width: "76%",
          min: 0,
          max: 1,
          minSize: "10%",
          maxSize: "100%",
          sort: "none",
          gap: 12,
          label: {
            show: true,
            position: "inside",
            formatter: (params: { data?: { rawValue?: number } }) => String(params.data?.rawValue ?? 0),
            color: "#111111",
            fontFamily: "Nunito Sans, sans-serif",
            fontSize: 12,
            fontWeight: 700,
          },
          labelLine: { show: false },
          itemStyle: {
            color,
            borderColor: "#ffffff",
            borderWidth: 2,
          },
          emphasis: {
            label: {
              color: "#111111",
            },
          },
          data: normalizedData,
        },
      ],
      graphic: hasValues
        ? undefined
        : {
            type: "text",
            left: "center",
            top: "middle",
            style: {
              text: "Sin volumen para este negocio",
              fill: "#737373",
              fontSize: 12,
            },
          },
    });

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [color, maxValue, metric]);

  return (
    <div
      ref={chartElement}
      className="performance-funnel-chart"
      role="img"
      aria-label={ariaLabel}
    />
  );
}

type ClosingRateOwnerChartProps = {
  ariaLabel: string;
  data: ClosingRateOwnerMetric[];
};

export function ClosingRateOwnerChart({
  ariaLabel,
  data,
}: ClosingRateOwnerChartProps) {
  const chartElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = chartElement.current;
    if (!element) return;

    const chart = echarts.init(element, undefined, { renderer: "svg" });
    const hasValues = data.length > 0;
    const maxRate = Math.max(...data.map((item) => item.tasaCierre), 0);
    const normalizedMaxRate = Math.min(
      1,
      Math.max(0.05, Math.ceil(maxRate / 0.05) * 0.05 + 0.05),
    );

    chart.setOption({
      animationDuration: 520,
      animationEasing: "cubicOut",
      color: ["#2f5f9e", "#c46b1f", "#23824f"],
      grid: { top: 18, right: 44, bottom: 92, left: 14, containLabel: true },
      legend: {
        top: 4,
        right: 12,
        itemWidth: 12,
        itemHeight: 8,
        textStyle: { color: "#525252", fontSize: 11 },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: echarts.TooltipComponentFormatterCallbackParams) => {
          const rows = Array.isArray(params) ? params : [params];
          const title = String(rows[0]?.name ?? "");
          const details = rows
            .map((row) => {
              const value = Array.isArray(row.value) ? row.value[1] : row.value;
              const formattedValue =
                row.seriesName === "Tasa de cierre"
                  ? `${(Number(value ?? 0) * 100).toFixed(2)}%`
                  : String(value ?? 0);
              return `${row.marker} ${row.seriesName}: <strong>${formattedValue}</strong>`;
            })
            .join("<br />");
          return `${title}<br />${details}`;
        },
      },
      xAxis: {
        type: "category",
        data: data.map((item) => item.propietario),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#d4d4d4" } },
        axisLabel: {
          color: "#595959",
          fontSize: 10,
          interval: 0,
          rotate: 42,
          hideOverlap: false,
        },
      },
      yAxis: [
        {
          type: "value",
          minInterval: 1,
          splitLine: { lineStyle: { color: "#e7e7e7" } },
          axisLabel: { color: "#737373", fontSize: 10 },
        },
        {
          type: "value",
          min: 0,
          max: normalizedMaxRate,
          splitLine: { show: false },
          axisLabel: {
            color: "#737373",
            fontSize: 10,
            formatter: (value: number) => `${(value * 100).toFixed(0)}%`,
          },
        },
      ],
      series: [
        {
          name: "Ventas",
          type: "bar",
          barGap: "30%",
          barMaxWidth: 14,
          itemStyle: { color: "#2f5f9e", borderRadius: [3, 3, 0, 0] },
          label: {
            show: true,
            position: "top",
            color: "#1f1f1f",
            fontFamily: "Nunito Sans, sans-serif",
            fontSize: 10,
            formatter: ({ value }: { value?: number }) => String(value ?? 0),
          },
          data: data.map((item) => item.ventas),
          z: 3,
        },
        {
          name: "Oportunidades",
          type: "bar",
          barMaxWidth: 14,
          itemStyle: { color: "#c46b1f", borderRadius: [3, 3, 0, 0] },
          label: {
            show: true,
            position: "top",
            distance: 8,
            color: "#525252",
            fontFamily: "Nunito Sans, sans-serif",
            fontSize: 10,
            formatter: ({ value }: { value?: number }) => String(value ?? 0),
          },
          data: data.map((item) => item.oportunidades),
          z: 2,
        },
        {
          name: "Tasa de cierre",
          type: "line",
          yAxisIndex: 1,
          smooth: 0.18,
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { width: 3, color: "#23824f" },
          itemStyle: { color: "#23824f", borderColor: "#ffffff", borderWidth: 2 },
          label: {
            show: true,
            position: "top",
            distance: 8,
            formatter: ({ value }: { value?: number | string | (number | string)[] }) => {
              const currentValue = Array.isArray(value) ? Number(value[1] ?? value[0] ?? 0) : Number(value ?? 0);
              return `${(currentValue * 100).toFixed(2)}%`;
            },
            color: "#2f2f2f",
            fontFamily: "Nunito Sans, sans-serif",
            fontSize: 10,
            fontWeight: 700,
            backgroundColor: "rgba(255,255,255,0.88)",
            borderRadius: 4,
            padding: [2, 4],
          },
          labelLayout: {
            hideOverlap: true,
            moveOverlap: "shiftY",
          },
          data: data.map((item) => item.tasaCierre),
          z: 4,
        },
      ],
      dataZoom: data.length > 12
        ? [
            {
              type: "inside",
              xAxisIndex: 0,
              startValue: 0,
              endValue: 11,
            },
            {
              type: "slider",
              xAxisIndex: 0,
              height: 16,
              bottom: 18,
              brushSelect: false,
              showDetail: false,
              borderColor: "#d8d8d8",
              fillerColor: "rgba(47,95,158,0.14)",
              handleSize: 0,
              startValue: 0,
              endValue: 11,
            },
          ]
        : undefined,
      graphic: hasValues
        ? undefined
        : {
            type: "text",
            left: "center",
            top: "middle",
            style: {
              text: "No hay oportunidades para los filtros seleccionados",
              fill: "#737373",
              fontSize: 12,
            },
          },
    });

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [data]);

  return (
    <div
      ref={chartElement}
      className="dashboard-chart dashboard-chart--closing-rates"
      role="img"
      aria-label={ariaLabel}
    />
  );
}
