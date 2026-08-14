import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VAULT_DIRS = [
  path.join(__dirname, '..', 'vault'),
  path.join(__dirname, '..', '..', 'vault'),
];

const nodes = [
  {
    id: 'ns-hub',
    title: 'NothingSense Ecosistema',
    content: `# NothingSense Hub

Centro neurálgico de productos y software:

- **Software & PKM:** [[GaviNote]], [[DecodificaTuDocumento]], [[Boda ZJ]].
- **EdTech:** [[Matkii LMS]], [[Tallerizador]], [[Local RAG Service]].
- **IA & Asistentes:** [[NoSe Brain]], [[Valiant Borg Automation]].
- **Hardware & IoT:** [[Vape Detector ESP32]], [[ESP32 Sensor Suite]].
- **Mobile & Gaming:** [[NAP Marketplace]], [[Capacitor Mobile]], [[Empire Tycoon]], [[La Matria MC Server]].`,
    tags: ['nothingsense', 'ecosistema', 'hub', 'arquitectura'],
    category: 'central',
    initialX: 0,
    initialY: 0,
    pinned: true,
  },
  {
    id: 'ns-gavinote',
    title: 'GaviNote',
    content: `## Segundo Cerebro Espacial
- [x] Motor de física Matter.js con gravedad cero e inercia.
- [x] Enlaces bidireccionales [[Wikilinks]] en tiempo real.
- [x] Quick Switcher (Ctrl+K) y Bóveda Local privada sincronizada con disco.
- [ ] Síntesis semántica automática con [[NoSe Brain]] y [[Local RAG Service]].`,
    tags: ['gavinote', 'pkm', 'second-brain', 'nextjs', 'matterjs'],
    category: 'idea',
    initialX: -340,
    initialY: -160,
    pinned: false,
  },
  {
    id: 'ns-matkii',
    title: 'Matkii LMS',
    content: `## Plataforma EdTech de Ciencias Exactas
- Evaluación adaptativa con doble aleatorización.
- Fórmulas matemáticas KaTeX y métodos paso a paso.
- Cifrado PII a nivel de base de datos con PostgreSQL y Prisma.
- Empaquetado nativo con [[Capacitor Mobile]].
- Banco de talleres pedagógicos generado por [[Tallerizador]].`,
    tags: ['matkii', 'edtech', 'nextjs', 'prisma', 'postgresql', 'katex'],
    category: 'central',
    initialX: 360,
    initialY: -180,
    pinned: false,
  },
  {
    id: 'ns-nose',
    title: 'NoSe Brain',
    content: `## Asistente Jarvis Local (Python)
- Reconocimiento de voz offline con Vosk (Wake word: "NoSe").
- Personalidad caribeña vallenata (Valledupar).
- Inferencia distribuida multi-nodo con Ollama.
- Auditoría de seguridad y escaneo de red local.
- Enlazado con [[NothingSense Ecosistema]] y [[GaviNote]].`,
    tags: ['nose', 'ia-local', 'python', 'vosk', 'ollama', 'seguridad'],
    category: 'referencia',
    initialX: -380,
    initialY: 160,
    pinned: false,
  },
  {
    id: 'ns-tallerizador',
    title: 'Tallerizador',
    content: `## Generador Pedagógico Inteligente
- Generación de guías de trabajo y evaluaciones alineadas a DBA Colombia.
- Utiliza [[Local RAG Service]] para estructurar problemas matemáticos con diagramas SVG.
- Exportación directa para el banco de evaluación de [[Matkii LMS]].`,
    tags: ['tallerizador', 'edtech', 'react', 'vite', 'rag'],
    category: 'tarea',
    initialX: 380,
    initialY: 160,
    pinned: false,
  },
  {
    id: 'ns-wao',
    title: 'DecodificaTuDocumento',
    content: `## Traductor IA de Documentos Complejos (wao)
Convierte recibos médicos, cartas de desalojo y contratos en explicaciones claras + próximos pasos accionables.
- Arquitectura serverless con Cloudflare Pages y Stripe.
- Integrado con la visión de [[NothingSense Ecosistema]].`,
    tags: ['wao', 'ia', 'documentos', 'stripe', 'cloudflare'],
    category: 'idea',
    initialX: -180,
    initialY: 340,
    pinned: false,
  },
  {
    id: 'ns-nap-market',
    title: 'NAP Marketplace',
    content: `## Plataforma de Servicios y Empleos
Marketplace de dos lados para conectar oferta y demanda laboral.
- [x] Cliente multiplataforma en Flutter y [[Capacitor Mobile]].
- [x] Backend serverless en Firebase Cloud Functions y Firestore.
- [ ] Integración de pasarelas de pago con Nequi y MercadoPago.`,
    tags: ['nap', 'marketplace', 'flutter', 'firebase', 'mobile'],
    category: 'tarea',
    initialX: 180,
    initialY: 340,
    pinned: false,
  },
  {
    id: 'ns-nap-backend',
    title: 'NAP Backend',
    content: `## Backend Serverless & Pasarelas de Pago
- Node.js Cloud Functions para lógica de negocio, comisiones y notificaciones push.
- Reglas de seguridad estrictas en Firebase Firestore.
- Conectado directamente a [[NAP Marketplace]].`,
    tags: ['backend', 'nodejs', 'firebase', 'cloud-functions'],
    category: 'referencia',
    initialX: 240,
    initialY: 480,
    pinned: false,
  },
  {
    id: 'ns-bodazj',
    title: 'Boda ZJ',
    content: `## Plataforma Integral de Eventos (Z&J)
- RSVP dinámico con token único para invitados.
- Muro de Gala en vivo con moderación y slideshow para proyector.
- Integración musical en tiempo real con Spotify API.
- Parte de [[NothingSense Ecosistema]].`,
    tags: ['bodazj', 'eventos', 'nextjs', 'prisma', 'spotify'],
    category: 'referencia',
    initialX: 0,
    initialY: -360,
    pinned: false,
  },
  {
    id: 'ns-vapdetector',
    title: 'Vape Detector ESP32',
    content: `## Sensor IoT de Detección de Aerosoles
- Firmware C++ en PlatformIO para microcontrolador ESP32.
- Sensores ópticos y de partículas para detección en tiempo real.
- Dashboard de monitoreo en PC y alertas instantáneas.
- Comparte arquitectura con [[ESP32 Sensor Suite]].`,
    tags: ['iot', 'esp32', 'hardware', 'c++', 'platformio', 'sensores'],
    category: 'alerta',
    initialX: -540,
    initialY: -40,
    pinned: false,
  },
  {
    id: 'ns-esp32',
    title: 'ESP32 Sensor Suite',
    content: `## Sistema Satelital de Sensores y Telemetría
- Red de sensores distribuidos con firmware PlatformIO.
- Comunicación por WiFi/BLE y estación central con dashboard.
- Diseñado para integración con [[Vape Detector ESP32]] y [[NoSe Brain]].`,
    tags: ['esp32', 'hardware', 'embedded', 'telemetria', 'iot'],
    category: 'referencia',
    initialX: -560,
    initialY: -220,
    pinned: false,
  },
  {
    id: 'ns-juego',
    title: 'Empire Tycoon',
    content: `## Videojuego de Estrategia y Gestión
- Construcción y gestión económica en HTML5 Canvas.
- Empaquetado APK para Android mediante [[Capacitor Mobile]].
- Sistema de guardado y progresión offline.`,
    tags: ['game', 'tycoon', 'javascript', 'capacitor', 'android'],
    category: 'idea',
    initialX: 540,
    initialY: -320,
    pinned: false,
  },
  {
    id: 'ns-minecraft',
    title: 'La Matria MC Server',
    content: `## Servidor de Minecraft & Automatización
- Servidor optimizado Paper/Spigot con plugins personalizados.
- Resource Pack dedicado con plantillas de texturas.
- Scripts de sincronización SFTP, RCON y backups automáticos.`,
    tags: ['minecraft', 'server', 'paper', 'python', 'sftp', 'gaming'],
    category: 'referencia',
    initialX: 560,
    initialY: -120,
    pinned: false,
  },
  {
    id: 'ns-valiant',
    title: 'Valiant Borg Automation',
    content: `## Herramienta de Automatización de Escritorio
- Aplicación gráfica de automatización y control en Python.
- Empaquetado standalone con PyInstaller.
- Complemento de productividad para [[NoSe Brain]].`,
    tags: ['automation', 'python', 'desktop', 'tools'],
    category: 'tarea',
    initialX: -520,
    initialY: 300,
    pinned: false,
  },
  {
    id: 'ns-rag',
    title: 'Local RAG Service',
    content: `## Motor RAG & Recuperación Aumentada
Indexación semántica y recuperación de conocimiento local para:
- [[Tallerizador]]: Generación de problemas y talleres.
- [[DecodificaTuDocumento]]: Extracción de cláusulas legales.
- [[GaviNote]]: Búsqueda semántica en el Segundo Cerebro.`,
    tags: ['rag', 'ia', 'embeddings', 'semantic-search'],
    category: 'referencia',
    initialX: 540,
    initialY: 60,
    pinned: false,
  },
  {
    id: 'ns-capacitor',
    title: 'Capacitor Mobile',
    content: `## Ecosistema Móvil Nativo
Estrategia híbrida para compilar aplicaciones web en APK nativos de Android:
- [[Matkii LMS]]: Experiencia K-12 móvil offline.
- [[NAP Marketplace]]: Acceso nativo para trabajadores.
- [[Empire Tycoon]]: Videojuego móvil.`,
    tags: ['capacitor', 'android', 'ios', 'mobile', 'pwa'],
    category: 'idea',
    initialX: 280,
    initialY: -360,
    pinned: false,
  },
];

for (const dir of VAULT_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  for (const node of nodes) {
    const filename = `${node.title.replace(/[/\\?%*:|"<>]/g, '_').trim()}.md`;
    const filepath = path.join(dir, filename);

    const markdown = [
      '---',
      `id: "${node.id}"`,
      `title: "${node.title.replace(/"/g, '\\"')}"`,
      `category: ${node.category}`,
      `tags: [${node.tags.map((t) => `"${t}"`).join(', ')}]`,
      `pinned: ${node.pinned}`,
      `initialX: ${node.initialX}`,
      `initialY: ${node.initialY}`,
      `createdAt: ${Date.now()}`,
      `updatedAt: ${Date.now()}`,
      '---',
      '',
      node.content,
      '',
    ].join('\n');

    fs.writeFileSync(filepath, markdown, 'utf-8');
    console.log(`[Vault] Escrito: ${filepath}`);
  }
}

console.log(`\n¡Bóveda Local sincronizada exitosamente con ${nodes.length} archivos .md en disco!`);
