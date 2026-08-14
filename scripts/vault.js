#!/usr/bin/env node

/**
 * CLI para gestión directa de notas y proyectos en la Bóveda Local (.md)
 * Permite ver, crear, editar y consultar el Segundo Cerebro sin abrir el navegador.
 *
 * Uso:
 *   node scripts/vault.js list
 *   node scripts/vault.js read "Matkii LMS"
 *   node scripts/vault.js create "Mi Proyecto" --category idea --tags "ia,mobile" --content "Contenido..."
 *   node scripts/vault.js sync
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VAULT_DIR = path.join(__dirname, '..', 'vault');
const ROOT_VAULT_DIR = path.join(__dirname, '..', '..', 'vault');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function parseMarkdown(content, filename) {
  let title = filename.replace(/\.md$/, '');
  let category = 'idea';
  let tags = [];
  let body = content;

  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (match) {
    const yaml = match[1];
    body = match[2].trim();

    const titleMatch = yaml.match(/title:\s*"([^"]+)"/);
    if (titleMatch) title = titleMatch[1];

    const catMatch = yaml.match(/category:\s*([a-zA-Z0-9_-]+)/);
    if (catMatch) category = catMatch[1];

    const tagsMatch = yaml.match(/tags:\s*\[(.*?)\]/);
    if (tagsMatch) {
      tags = tagsMatch[1].split(',').map((t) => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    }
  }

  // Extract [[Wikilinks]]
  const links = [];
  const linkRegex = /\[\[(.*?)\]\]/g;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(body)) !== null) {
    links.push(linkMatch[1].trim());
  }

  return { title, category, tags, body, links };
}

const args = process.argv.slice(2);
const command = args[0] || 'list';

ensureDir(VAULT_DIR);
ensureDir(ROOT_VAULT_DIR);

switch (command) {
  case 'list': {
    const files = fs.readdirSync(VAULT_DIR).filter((f) => f.endsWith('.md'));
    console.log(`\n🪐 Bóveda Local de NothingSense (${files.length} Proyectos / Notas en Disco)\n`);
    console.log('='.repeat(75));
    console.log(
      `${'TÍTULO'.padEnd(30)} ${'CATEGORÍA'.padEnd(12)} ${'ENLACES'.padEnd(10)} ${'ETIQUETAS'}`
    );
    console.log('='.repeat(75));

    for (const file of files) {
      const content = fs.readFileSync(path.join(VAULT_DIR, file), 'utf-8');
      const meta = parseMarkdown(content, file);
      console.log(
        `${meta.title.padEnd(30)} ${meta.category.padEnd(12)} ${String(meta.links.length).padEnd(10)} ${meta.tags.join(', ')}`
      );
    }
    console.log('='.repeat(75));
    console.log(`\nTip: Usa 'node scripts/vault.js read "<título>"' para ver el detalle de una nota.\n`);
    break;
  }

  case 'read': {
    const query = args[1];
    if (!query) {
      console.error('Error: Especifica el título de la nota a leer. Ej: node scripts/vault.js read "Matkii LMS"');
      process.exit(1);
    }

    const files = fs.readdirSync(VAULT_DIR).filter((f) => f.endsWith('.md'));
    const matched = files.find(
      (f) => f.toLowerCase().includes(query.toLowerCase()) || f.replace(/\.md$/, '').toLowerCase() === query.toLowerCase()
    );

    if (!matched) {
      console.error(`Nota "${query}" no encontrada en la bóveda.`);
      process.exit(1);
    }

    const content = fs.readFileSync(path.join(VAULT_DIR, matched), 'utf-8');
    const meta = parseMarkdown(content, matched);

    console.log(`\n📄 NOTA: ${meta.title}`);
    console.log(`🏷️  Categoría: ${meta.category} | Tags: [${meta.tags.join(', ')}]`);
    console.log(`🔗 Enlaces bidireccionales ([[Wikilinks]]): ${meta.links.length > 0 ? meta.links.join(', ') : 'Ninguno'}`);
    console.log('-'.repeat(60));
    console.log(meta.body);
    console.log('-'.repeat(60) + '\n');
    break;
  }

  case 'create':
  case 'edit': {
    const title = args[1];
    if (!title) {
      console.error('Error: Especifica el título de la nota.');
      process.exit(1);
    }

    let category = 'idea';
    let tags = [];
    let content = '';

    for (let i = 2; i < args.length; i++) {
      if (args[i] === '--category' && args[i + 1]) category = args[++i];
      if (args[i] === '--tags' && args[i + 1]) tags = args[++i].split(',').map((t) => t.trim());
      if (args[i] === '--content' && args[i + 1]) content = args[++i];
    }

    const filename = `${title.replace(/[/\\?%*:|"<>]/g, '_').trim()}.md`;
    const filepath = path.join(VAULT_DIR, filename);

    const markdown = [
      '---',
      `id: "node-${Math.random().toString(36).slice(2, 11)}"`,
      `title: "${title.replace(/"/g, '\\"')}"`,
      `category: ${category}`,
      `tags: [${tags.map((t) => `"${t}"`).join(', ')}]`,
      `pinned: false`,
      `initialX: ${(Math.random() - 0.5) * 400}`,
      `initialY: ${(Math.random() - 0.5) * 400}`,
      `createdAt: ${Date.now()}`,
      `updatedAt: ${Date.now()}`,
      '---',
      '',
      content || `# ${title}\n\nNueva nota creada desde CLI.`,
      '',
    ].join('\n');

    fs.writeFileSync(filepath, markdown, 'utf-8');
    if (fs.existsSync(ROOT_VAULT_DIR)) {
      fs.writeFileSync(path.join(ROOT_VAULT_DIR, filename), markdown, 'utf-8');
    }

    console.log(`\n✅ Nota "${title}" guardada exitosamente en disco (${filepath})`);
    break;
  }

  case 'sync': {
    const files = fs.readdirSync(VAULT_DIR).filter((f) => f.endsWith('.md'));
    for (const f of files) {
      const src = path.join(VAULT_DIR, f);
      const dst = path.join(ROOT_VAULT_DIR, f);
      fs.copyFileSync(src, dst);
    }
    console.log(`\n🔄 Sincronizados ${files.length} archivos Markdown entre GaviNote/vault/ y NothingSense/vault/`);
    break;
  }

  default:
    console.log('Comandos disponibles: list, read, create, edit, sync');
}
