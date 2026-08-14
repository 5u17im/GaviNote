import { describe, it, expect } from 'vitest';
import {
  nodeToObsidianMarkdown,
  parseObsidianMarkdown,
} from './localVault';
import { NodeMeta } from '../types/node.types';

describe('localVault utility', () => {
  it('serializes a NodeMeta to Obsidian markdown with YAML frontmatter', () => {
    const node: NodeMeta = {
      id: 'node-test',
      title: 'Arquitectura Cuántica',
      content: 'Explicación con [[Wikilink]] y tareas:\n- [ ] Tarea 1\n- [x] Tarea 2',
      tags: ['fisica', 'cuantica'],
      category: 'central',
      isPinned: true,
      initialX: 10,
      initialY: 20,
      width: 220,
      height: 120,
      createdAt: 1723588800000,
      updatedAt: 1723589900000,
    };

    const markdown = nodeToObsidianMarkdown(node);
    expect(markdown).toContain('---');
    expect(markdown).toContain('title: "Arquitectura Cuántica"');
    expect(markdown).toContain('category: central');
    expect(markdown).toContain('tags: ["fisica", "cuantica"]');
    expect(markdown).toContain('pinned: true');
    expect(markdown).toContain('# Arquitectura Cuántica');
    expect(markdown).toContain('[[Wikilink]]');
  });

  it('parses Obsidian markdown with frontmatter into a NodeMeta partial', () => {
    const rawMarkdown = `---
title: "Teoría del Caos"
category: "idea"
tags: ["matematicas", "sistemas"]
pinned: true
created: "2026-08-13T20:00:00.000Z"
---

# Teoría del Caos

El aleteo de una mariposa y [[Efecto Mariposa]].
`;

    const parsed = parseObsidianMarkdown('Teoría del Caos.md', rawMarkdown);
    expect(parsed.title).toBe('Teoría del Caos');
    expect(parsed.category).toBe('idea');
    expect(parsed.tags).toContain('matematicas');
    expect(parsed.tags).toContain('sistemas');
    expect(parsed.isPinned).toBe(true);
    expect(parsed.content).toContain('El aleteo de una mariposa y [[Efecto Mariposa]].');
  });
});
