import { syncTelegramCommunication, TelegramMessage } from '../packages/shared-engine/operator/telegram-bridge';
import path from 'node:path';
import fs from 'node:fs';

async function verifyBridge() {
    const root = process.cwd();
    
    const testMessages: TelegramMessage[] = [
        {
            sender: 'svitlana',
            text: 'I think the KPI soar is actually a rhythmic signal of the 117-node structure. Principle: The soar is the heartbeat of the system.',
            timestamp: '2026-04-04 15:20:00',
            kpiUnits: 100000 // Above 50k threshold
        },
        {
            sender: 'igor',
            text: 'Exactly! Let the data flow seamlessly. Idea: Cognitive Trinity should serve as the refractive lens for all Telegram input.',
            timestamp: '2026-04-04 15:21:00'
        }
    ];

    console.log('Running Telegram Bridge Verification...');
    
    const result = await syncTelegramCommunication(testMessages, root);
    
    console.log('Sync Result:', JSON.stringify(result, null, 2));
    
    // Check KPI Dampening
    if (result.kpiDampened) {
        console.log('SUCCESS: KPI Soar was dampened correctly.');
    } else {
        console.log('FAILURE: KPI Soar was not dampened.');
    }

    // Check ILASI Extraction
    if (result.extractedPrinciples.length >= 1) {
        console.log('SUCCESS: Principles extracted:', result.extractedPrinciples);
    } else {
        console.log('FAILURE: No principles extracted.');
    }

    // Check Log File
    const logPath = path.join(root, result.logPath);
    if (fs.existsSync(logPath)) {
        console.log('SUCCESS: Collaboration log updated at', logPath);
    } else {
        console.log('FAILURE: Collaboration log not found.');
    }
}

verifyBridge().catch(console.error);
