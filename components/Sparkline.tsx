import React, { useRef, useEffect } from 'react';

interface SparklineProps {
  data: number[];
  type: 'line' | 'bar';
}

const Sparkline: React.FC<SparklineProps> = ({ data, type }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;
    
    const ChartJs = (window as any).Chart;
    if (!ChartJs || !canvasRef.current) return;

    const chartInstance = new ChartJs(canvasRef.current, {
      type: type,
      data: {
        labels: data.map((_, i) => i),
        datasets: [{
          data: data,
          borderColor: '#EBCFD2',
          backgroundColor: 'rgba(163, 77, 93, 0.6)',
          borderWidth: type === 'line' ? 1.5 : 1,
          pointRadius: 0, // No dots on the line
          tension: 0.1,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: false },
          y: { display: false }
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        animation: { duration: 0 },
        layout: {
            padding: { top: 4, bottom: 4, left: 2, right: 2 }
        }
      }
    });

    return () => chartInstance.destroy();
  }, [data, type]);

  return <div className="w-full h-full p-1"><canvas ref={canvasRef}></canvas></div>;
};

export default Sparkline;
