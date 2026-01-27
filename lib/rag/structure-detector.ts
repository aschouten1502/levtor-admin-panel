/**
 * ========================================
 * STRUCTURE DETECTOR - Document Hiërarchie Detectie
 * ========================================
 *
 * Detecteert structuur in documenten via regex patronen.
 * Ondersteunt Nederlandse en Engelse HR documenten.
 *
 * Patronen:
 * - Artikelen: "Artikel 4.3", "Art. 12", "Article 5"
 * - Hoofdstukken: "Hoofdstuk 2", "Chapter 3"
 * - Secties: "§ 2.1", "Section 3.2"
 * - Genummerde items: "1.", "1.1", "1.1.1"
 * - Headers in CAPS
 */

import { DocumentStructure } from './types';

// ========================================
// STRUCTURE PATTERNS
// ========================================

/**
 * Regex patronen voor document structuur detectie
 * Geordend op specificiteit (meest specifiek eerst)
 */
const STRUCTURE_PATTERNS = {
  // Hoofdstukken: "Hoofdstuk 2", "Chapter 3", "HOOFDSTUK 1"
  chapter: {
    pattern: /^(?:HOOFDSTUK|Hoofdstuk|CHAPTER|Chapter)\s+(\d+)\s*[:\-–.]?\s*(.*)$/im,
    level: 1,
    type: 'chapter' as const
  },

  // Bijlagen/Appendices: "Bijlage 1", "Bijlage A", "Appendix 2", "Annex I"
  // Generiek voor alle CAO's en juridische documenten
  appendix: {
    pattern: /^(?:BIJLAGE|Bijlage|APPENDIX|Appendix|ANNEX|Annex)\s+([A-Z0-9]+)\s*[:\-–.]?\s*(.*)$/im,
    level: 1,
    type: 'chapter' as const
  },

  // Artikelen: "Artikel 4.3", "Art. 12", "Article 5", "ARTIKEL 2.1"
  article: {
    pattern: /^(?:ARTIKEL|Artikel|ART\.?|Art\.?|ARTICLE|Article)\s+(\d+(?:\.\d+)*)\s*[:\-–.]?\s*(.*)$/im,
    level: 2,
    type: 'article' as const
  },

  // Lid binnen artikel: "Lid 1", "Lid 2", "1." gevolgd door tekst binnen artikel context
  // Standaard CAO structuur voor subsecties binnen artikelen
  lid: {
    pattern: /^(?:LID|Lid)\s+(\d+)\s*[:\-–.]?\s*(.*)$/im,
    level: 3,
    type: 'section' as const
  },

  // Secties: "§ 2.1", "Section 3.2", "Sectie 1"
  section: {
    pattern: /^(?:§|SECTION|Section|SECTIE|Sectie)\s*(\d+(?:\.\d+)*)\s*[:\-–.]?\s*(.*)$/im,
    level: 2,
    type: 'section' as const
  },

  // Definities sectie: "Definities", "Begripsbepalingen", "Begrippen"
  // Vaak aan het begin van CAO's
  definitions: {
    pattern: /^(?:DEFINITIES|Definities|BEGRIPSBEPALINGEN|Begripsbepalingen|BEGRIPPEN|Begrippen|DEFINITIONS|Definitions)\s*$/im,
    level: 2,
    type: 'section' as const
  },

  // Overgangs- en slotbepalingen: standaard CAO secties
  transitionProvisions: {
    pattern: /^(?:OVERGANGSBEPALINGEN|Overgangsbepalingen|SLOTBEPALINGEN|Slotbepalingen|INWERKINGTREDING|Inwerkingtreding)\s*$/im,
    level: 2,
    type: 'section' as const
  },

  // Genummerde secties met titel: "1. Inleiding", "2.3 Vakantiedagen"
  numberedSection: {
    pattern: /^(\d+(?:\.\d+)*)\.\s+([A-Z][a-zA-Z\s]{2,50})$/m,
    level: 2,
    type: 'section' as const
  },

  // Sub-artikelen: "sub a", "sub 1", of diepere nummering "4.3.1"
  subArticle: {
    pattern: /^(?:SUB|Sub|sub)\s+([a-z0-9]+)\s*[:\-–.]?\s*(.*)$/im,
    level: 3,
    type: 'section' as const
  },

  // CAPS headers (minstens 10 karakters, alleen letters en spaties)
  capsHeader: {
    pattern: /^([A-Z][A-Z\s]{9,60})$/m,
    level: 1,
    type: 'header' as const
  },

  // Subsecties met letters: "a.", "b)", "(a)"
  letterSubsection: {
    pattern: /^(?:\(([a-z])\)|([a-z])[.)])\s+(.+)$/im,
    level: 3,
    type: 'section' as const
  }
};

// ========================================
// MAIN DETECTION FUNCTION
// ========================================

/**
 * Detecteert alle structuur elementen in een tekst
 *
 * @param text - De volledige document tekst
 * @returns Array van DocumentStructure objecten, gesorteerd op startIndex
 */
export function detectStructure(text: string): DocumentStructure[] {
  const structures: DocumentStructure[] = [];
  const lines = text.split('\n');
  let currentIndex = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.length > 0) {
      // Probeer elk pattern
      for (const [patternName, config] of Object.entries(STRUCTURE_PATTERNS)) {
        const match = trimmedLine.match(config.pattern);

        if (match) {
          const structure = createStructureFromMatch(
            match,
            config.type,
            config.level,
            currentIndex,
            patternName
          );

          if (structure) {
            structures.push(structure);
            break; // Stop na eerste match
          }
        }
      }
    }

    currentIndex += line.length + 1; // +1 voor newline
  }

  // Sorteer op startIndex
  structures.sort((a, b) => a.startIndex - b.startIndex);

  // Bereken endIndex voor elk element (tot start van volgende)
  for (let i = 0; i < structures.length; i++) {
    if (i < structures.length - 1) {
      structures[i].endIndex = structures[i + 1].startIndex - 1;
    } else {
      structures[i].endIndex = text.length;
    }
  }

  console.log(`🏗️ [Structure] Detected ${structures.length} structure elements`);

  return structures;
}

/**
 * Maakt een DocumentStructure object van een regex match
 */
function createStructureFromMatch(
  match: RegExpMatchArray,
  type: DocumentStructure['type'],
  level: number,
  startIndex: number,
  patternName: string
): DocumentStructure | null {
  // Filter out false positives
  if (patternName === 'capsHeader') {
    // Skip als het gewoon een paar woorden zijn zonder betekenis
    const text = match[1];
    if (text.split(/\s+/).length < 2) return null;
    // Skip common non-header phrases
    if (/^(PDF|PAGE|PAGINA|DATUM|DATE|NR|NO)\s/i.test(text)) return null;
  }

  let identifier: string | undefined;
  let title: string | undefined;

  switch (patternName) {
    case 'chapter':
      identifier = `Hoofdstuk ${match[1]}`;
      title = match[2]?.trim() || undefined;
      break;

    case 'appendix':
      identifier = `Bijlage ${match[1]}`;
      title = match[2]?.trim() || undefined;
      break;

    case 'article':
      identifier = `Artikel ${match[1]}`;
      title = match[2]?.trim() || undefined;
      break;

    case 'lid':
      identifier = `Lid ${match[1]}`;
      title = match[2]?.trim() || undefined;
      break;

    case 'section':
      identifier = `§ ${match[1]}`;
      title = match[2]?.trim() || undefined;
      break;

    case 'definitions':
      title = 'Definities';
      break;

    case 'transitionProvisions':
      title = match[0]?.trim() || 'Overgangsbepalingen';
      break;

    case 'numberedSection':
      identifier = match[1];
      title = match[2]?.trim() || undefined;
      break;

    case 'subArticle':
      identifier = `sub ${match[1]}`;
      title = match[2]?.trim() || undefined;
      break;

    case 'capsHeader':
      title = match[1].trim();
      break;

    case 'letterSubsection':
      identifier = match[1] || match[2];
      title = match[3]?.trim() || undefined;
      break;
  }

  return {
    type,
    identifier,
    title,
    level,
    startIndex,
    endIndex: startIndex, // Wordt later bijgewerkt
    children: []
  };
}

// ========================================
// HIERARCHY BUILDING
// ========================================

/**
 * Bouwt een hiërarchische boom van DocumentStructure elementen
 *
 * @param structures - Flat array van structuren
 * @returns Root DocumentStructure met children
 */
export function buildHierarchy(structures: DocumentStructure[]): DocumentStructure {
  const root: DocumentStructure = {
    type: 'chapter',
    identifier: 'root',
    title: 'Document',
    level: 0,
    startIndex: 0,
    endIndex: Infinity,
    children: []
  };

  const stack: DocumentStructure[] = [root];

  for (const structure of structures) {
    // Pop items van de stack totdat we een parent vinden
    while (stack.length > 1 && stack[stack.length - 1].level >= structure.level) {
      stack.pop();
    }

    // Voeg toe aan huidige parent
    const parent = stack[stack.length - 1];
    structure.parent = parent;
    parent.children.push(structure);

    // Push op stack als potentiële parent
    stack.push(structure);
  }

  return root;
}

/**
 * Haalt het hiërarchische pad op voor een structuur element
 *
 * @param structure - Het DocumentStructure element
 * @returns Array van labels van root naar dit element
 */
export function getStructurePath(structure: DocumentStructure): string[] {
  const path: string[] = [];
  let current: DocumentStructure | undefined = structure;

  while (current && current.identifier !== 'root') {
    const label = current.identifier
      ? (current.title ? `${current.identifier} ${current.title}` : current.identifier)
      : current.title;

    if (label) {
      path.unshift(label);
    }

    current = current.parent;
  }

  return path;
}

// ========================================
// CONTEXT HEADER GENERATION
// ========================================

/**
 * Genereert een context header voor een chunk
 *
 * @param documentName - Naam van het document
 * @param structure - Het huidige structuur element (of undefined)
 * @param allStructures - Alle gedetecteerde structuren
 * @param chunkStartIndex - Start positie van de chunk in de tekst
 * @returns Context header string zoals "[Document > Hoofdstuk > Artikel]"
 */
export function generateContextHeader(
  documentName: string,
  structure: DocumentStructure | undefined,
  allStructures: DocumentStructure[],
  chunkStartIndex: number
): string {
  // Verwijder .pdf extensie
  const docBaseName = documentName.replace(/\.pdf$/i, '').trim();

  // Als geen specifieke structuur, zoek de meest recente voor deze positie
  if (!structure) {
    structure = findStructureAtPosition(allStructures, chunkStartIndex);
  }

  if (!structure) {
    return `[${docBaseName}]`;
  }

  const path = getStructurePath(structure);

  if (path.length === 0) {
    return `[${docBaseName}]`;
  }

  return `[${docBaseName} > ${path.join(' > ')}]`;
}

/**
 * Vindt het structuur element dat geldt voor een specifieke positie
 */
export function findStructureAtPosition(
  structures: DocumentStructure[],
  position: number
): DocumentStructure | undefined {
  // Zoek het laatste element dat voor deze positie begint
  let result: DocumentStructure | undefined;

  for (const structure of structures) {
    if (structure.startIndex <= position) {
      // Prefereer meer specifieke (hogere level) structuren
      if (!result || structure.level >= result.level) {
        result = structure;
      }
    }
  }

  return result;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Bepaalt of een tekst een structure marker bevat
 * Handig om te bepalen of we op een nieuwe structuur grens zitten
 */
export function hasStructureMarker(text: string): boolean {
  const trimmed = text.trim();

  for (const config of Object.values(STRUCTURE_PATTERNS)) {
    if (config.pattern.test(trimmed)) {
      return true;
    }
  }

  return false;
}

/**
 * Haalt structuur info op voor logging/debugging
 */
export function getStructureSummary(structures: DocumentStructure[]): string {
  const counts: Record<string, number> = {};

  for (const s of structures) {
    counts[s.type] = (counts[s.type] || 0) + 1;
  }

  const parts = Object.entries(counts)
    .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
    .join(', ');

  return parts || 'no structures';
}
