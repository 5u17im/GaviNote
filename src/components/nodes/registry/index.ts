import { NodeCategory } from '../../../types/node.types';

export const CATEGORY_INFO: Record<NodeCategory, {
  label: string;
  color: string;
  glowColor: string;
  icon: string;
}> = {
  central: {
    label: 'Idea Central',
    color: '#00FF87',
    glowColor: 'rgba(0, 255, 135, 0.4)',
    icon: '🪐',
  },
  idea: {
    label: 'Idea',
    color: '#00E5FF', // Cian
    glowColor: 'rgba(0, 229, 255, 0.4)',
    icon: '🚀',
  },
  tarea: {
    label: 'Tarea',
    color: '#FFB300', // Ámbar
    glowColor: 'rgba(255, 179, 0, 0.4)',
    icon: '✨',
  },
  referencia: {
    label: 'Referencia',
    color: '#CE93D8', // Violeta
    glowColor: 'rgba(206, 147, 216, 0.4)',
    icon: '🧲',
  },
  alerta: {
    label: 'Alerta',
    color: '#FF5252', // Coral
    glowColor: 'rgba(255, 82, 82, 0.4)',
    icon: '🚨',
  },
};
