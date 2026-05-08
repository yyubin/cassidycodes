'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';

interface MermaidDiagramProps {
  chart: string;
}

let mermaidInitialized = false;

// [hex, rgb(r, g, b), dark] — .mmd style 지시어에서 사용하는 밝은 서브그래프 배경색
const SUBGRAPH_COLOR_MAP: [string, string, string][] = [
  ['#e3f2fd', 'rgb(227, 242, 253)', '#0f2744'],
  ['#e8f5e9', 'rgb(232, 245, 233)', '#0f2918'],
  ['#f3e5f5', 'rgb(243, 229, 245)', '#1a0d35'],
  ['#fff3e0', 'rgb(255, 243, 224)', '#251a08'],
  ['#ffe0b2', 'rgb(255, 224, 178)', '#251a08'],
  ['#e1bee7', 'rgb(225, 190, 231)', '#1a0d35'],
];

const applyDarkSubgraphColors = (svg: string): string => {
  let result = svg;
  for (const [hex, rgb, dark] of SUBGRAPH_COLOR_MAP) {
    result = result.replaceAll(hex, dark).replaceAll(rgb, dark);
  }
  return result;
};

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: resolvedTheme === 'dark' ? 'dark' : 'default',
      themeVariables: resolvedTheme === 'dark' ? {
        background: 'transparent',
        mainBkg: '#1e293b',
        nodeBorder: '#475569',
        clusterBkg: '#111827',
        titleColor: '#f1f5f9',
        edgeLabelBackground: '#1e293b',
        lineColor: '#64748b',
        labelTextColor: '#f1f5f9',
      } : undefined,
      securityLevel: 'loose',
      fontFamily: 'inherit',
    });
    mermaidInitialized = true;

    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substring(7)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(resolvedTheme === 'dark' ? applyDarkSubgraphColors(svg) : svg);
      } catch (error) {
        console.error('Mermaid rendering error:', error);
      }
    };

    renderDiagram();
  }, [chart, resolvedTheme]);

  return (
    <div className="mermaid-container overflow-x-auto">
      <div
        ref={ref}
        className="flex justify-center"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
