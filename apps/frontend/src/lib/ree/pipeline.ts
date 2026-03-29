import type { PipelineStage } from '@prisma/client';

export const PIPELINE_STAGES: {
  id: PipelineStage;
  label: string;
}[] = [
  { id: 'BRIEF_INTAKE', label: 'Brief intake' },
  { id: 'ESTRATEGIA', label: 'Estrategia' },
  { id: 'VALIDACION', label: 'Validación' },
  { id: 'CALENDARIO', label: 'Calendario' },
  { id: 'PRODUCCION', label: 'Producción' },
  { id: 'EVALUACION', label: 'Evaluación' },
];

export function pipelineStageColor(stage: PipelineStage): string {
  switch (stage) {
    case 'BRIEF_INTAKE':
      return '#3498DB';
    case 'ESTRATEGIA':
      return '#FF6B35';
    case 'VALIDACION':
      return '#F1C40F';
    case 'CALENDARIO':
      return '#9B59B6';
    case 'PRODUCCION':
      return '#00FF87';
    case 'EVALUACION':
      return '#E63946';
    default:
      return '#888888';
  }
}
