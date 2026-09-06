import { LabMetrics, StepEvent } from '@/types';

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportMetricsToCSV(metrics: LabMetrics, traceHistory: StepEvent[], labTitle: string): string {
  const lines: string[] = [];

  lines.push(`"Лабораторна робота","${labTitle}"`);
  lines.push(`"Дата/Час","${new Date().toLocaleString('uk-UA')}"`);
  lines.push(`"Результат пошуку","${metrics.statusText}"`);
  lines.push(`"Знайдений шлях","${metrics.foundPath ? metrics.foundPath.join(' -> ') : 'Не знайдено'}"`);
  lines.push(`"Довжина шляху (ребер)","${metrics.pathLength}"`);
  lines.push(`"Кількість розкритих вершин","${metrics.openedVerticesCount}"`);
  lines.push(`"Кількість циклів пошуку","${metrics.cyclesCount}"`);
  lines.push(`"Час виконання (мс)","${metrics.executionTimeMs.toFixed(3)}"`);
  lines.push('');
  lines.push('"Крок","Поточна вершина","Черга (Queue)","Розкрито","Дія / Пояснення"');

  traceHistory.forEach((step, idx) => {
    const queueStr = `[${step.queue.join(', ')}]`;
    const actionClean = step.actionDescription.replace(/"/g, '""');
    lines.push(`${idx + 1},${step.currentNodeId ?? '-'},"${queueStr}",${step.openedCount},"${actionClean}"`);
  });

  return lines.join('\n');
}

export function exportCanvasToPNG(canvas: HTMLCanvasElement, filename: string = 'graph-screenshot.png'): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
