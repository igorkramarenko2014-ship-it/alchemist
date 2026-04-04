/**
 * TELEGRAM OUTSIDE AGENT BRIDGE
 * 
 * Automates the flow from personal Telegram communication (Igor-Svitlana)
 * to the structural IOM state. Enforces Phase 1 KPI Guardrails.
 */

import { shigorCore } from './shigor-core';
import { applyKpiGuardrails } from '../token-ledger-logic';
import fs from 'node:fs';
import path from 'node:path';

export interface TelegramMessage {
  sender: 'igor' | 'svitlana';
  text: string;
  timestamp: string;
  kpiUnits?: number;
}

export interface SyncResult {
  syncedEntries: number;
  extractedPrinciples: string[];
  kpiDampened: boolean;
  logPath: string;
}

const COLLAB_LOG_PATH = 'docs/logs/shigor-athena-collaboration.md';
const ILASI_PATH = 'docs/ILASI.md';

/**
 * Automates the synchronization of Telegram messages into the IOM.
 * Extracts crazy ideas for ILASI and updates the collaboration log.
 */
export async function syncTelegramCommunication(
    messages: TelegramMessage[], 
    repoRoot: string
): Promise<SyncResult> {
    const fullLogPath = path.join(repoRoot, COLLAB_LOG_PATH);
    const fullIlasiPath = path.join(repoRoot, ILASI_PATH);
    
    let kpiDampened = false;
    const extractedPrinciples: string[] = [];

    // Ensure logs directory exists
    const logsDir = path.dirname(fullLogPath);
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    let logContent = '';
    if (fs.existsSync(fullLogPath)) {
        logContent = fs.readFileSync(fullLogPath, 'utf8');
    } else {
        logContent = '# Shigor - Athena Collaboration Log\n\nAutomated sync from Telegram Outside Agent Bridge.\n\n';
    }

    for (const msg of messages) {
        // 1. KPI Guardrails Application
        if (msg.kpiUnits) {
            const guard = applyKpiGuardrails(msg.kpiUnits);
            if (guard.dampened) kpiDampened = true;
            msg.kpiUnits = guard.effective;
        }

        // 2. Append to Collaboration Log
        const entry = `\n### [${msg.timestamp}] ${msg.sender === 'igor' ? 'Igor (Shigor)' : 'Svitlana (Athena)'}\n${msg.text}\n`;
        logContent += entry;

        // 3. Automated ILASI Extraction (Crazy Ideas detection)
        // Heuristic: If it looks like a formula, a principle, or a "crazy idea"
        if (msg.text.includes('Principle') || msg.text.includes('Idea:') || msg.text.length > 200) {
            const principle = extractPrinciple(msg.text);
            if (principle) {
                extractedPrinciples.push(principle);
                appendtoILASI(fullIlasiPath, principle, msg.timestamp);
            }
        }
    }

    fs.writeFileSync(fullLogPath, logContent, 'utf8');

    return {
        syncedEntries: messages.length,
        extractedPrinciples,
        kpiDampened,
        logPath: COLLAB_LOG_PATH
    };
}

/**
 * Heuristic parser for extracting architectural principles.
 */
function extractPrinciple(text: string): string | null {
    if (text.length < 50) return null;
    
    // Extract everything after "Idea:" or just take the first meaningful line
    const lines = text.split('\n');
    const firstLine = lines.find(l => l.trim().length > 0) || '';
    
    return firstLine.replace('Idea:', '').trim();
}

/**
 * Appends the extracted principle to docs/ILASI.md.
 */
function appendtoILASI(ilasiPath: string, principle: string, timestamp: string) {
    if (!fs.existsSync(ilasiPath)) return;
    
    const content = fs.readFileSync(ilasiPath, 'utf8');
    
    // Find the last Principle number
    const principleMatches = content.match(/#### ПРИНЦИП (\d+)/g);
    let nextNum = 13; // Start from 13 if not found
    if (principleMatches) {
        const lastNum = parseInt(principleMatches[principleMatches.length - 1].match(/\d+/)?.[0] || '12');
        nextNum = lastNum + 1;
    }

    const newPrincipleBlock = `
#### ПРИНЦИП ${nextNum.toString().padStart(3, '0')} — Automated Extraction
**Контеĸст:** Automated sync from Telegram, ${timestamp}  
**Формулювання:**
> ${principle}

**Застосування:** Captured by Telegram Outside Agent for architectural refinement.
`;

    fs.appendFileSync(ilasiPath, newPrincipleBlock, 'utf8');
}
