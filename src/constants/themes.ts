/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UITheme } from '../types';

export const UI_THEMES: UITheme[] = [
  {
    id: 'sakura-breeze',
    name: '🌸 Sakura Breeze',
    description: 'The classic elegant pastel cherry blossom theme with soft ivory canvas and delicate pink highlights.',
    colors: {
      bgPrimary: '#FFF5F7',
      sidebarBg: '#FCE7F3',
      accent: '#F472B6',
      textMain: '#500724',
      textMuted: '#9D174D',
      border: '#FBCFE8',
      cardBg: 'rgba(255, 255, 255, 0.72)',
      editorBg: '#FFFFFF',
    }
  },
  {
    id: 'strawberry-gelato',
    name: '🍧 Strawberry Gelato',
    description: 'Crisp, summery strawberry tones with juicy high-contrast watermelon-pinks for playful inspiration.',
    colors: {
      bgPrimary: '#FFF0F3',
      sidebarBg: '#FFE1E6',
      accent: '#FF4D6D',
      textMain: '#590D22',
      textMuted: '#A4133C',
      border: '#FFB3C1',
      cardBg: 'rgba(255, 255, 255, 0.75)',
      editorBg: '#FFFFFF',
    }
  },
  {
    id: 'rose-quartz',
    name: '✨ Rose Quartz',
    description: 'Earthy golden-peach pinks, dusty minerals, and sand-quartz borders to ground your mind in serenity.',
    colors: {
      bgPrimary: '#FBF5F3',
      sidebarBg: '#ECD2C4',
      accent: '#D4A373',
      textMain: '#4A3525',
      textMuted: '#B07D62',
      border: '#E6CCBE',
      cardBg: 'rgba(255, 255, 255, 0.65)',
      editorBg: '#FAF5F0',
    }
  },
  {
    id: 'magenta-twilight',
    name: '🌌 Magenta Twilight',
    description: 'A rich velvet plum and dark neon orchid dark mode designed for gentle night-time journaling.',
    colors: {
      bgPrimary: '#1E101A',
      sidebarBg: '#2F1827',
      accent: '#F43F5E',
      textMain: '#FDF2F8',
      textMuted: '#F472B6',
      border: '#4A203B',
      cardBg: 'rgba(15, 10, 13, 0.65)',
      editorBg: '#251420',
    }
  },
  {
    id: 'bubblegum-pop',
    name: '🎈 Bubblegum Pop',
    description: 'An electric 90s aesthetic featuring high-energy hot magentas and playful deep grape accents.',
    colors: {
      bgPrimary: '#FDF4FF',
      sidebarBg: '#F5D0FE',
      accent: '#D946EF',
      textMain: '#4A044E',
      textMuted: '#C026D3',
      border: '#E879F9',
      cardBg: 'rgba(255, 251, 255, 0.8)',
      editorBg: '#FFFFFF',
    }
  }
];

export const DEFAULT_THEME_ID = 'sakura-breeze';

export const DEFAULT_SAKURA_CONFIG = {
  enabled: true,
  count: 'medium' as const,
  speed: 'breeze' as const,
  wind: 'calm' as const,
  style: 'classic' as const,
};
