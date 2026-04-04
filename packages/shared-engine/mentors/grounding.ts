/**
 * MENTOR GROUNDING CORE
 * 
 * Formalizes the Natalia (Weight 0.90) and Lyubchenko (Weight 0.75) 
 * patterns as a combined grounding layer for high-energy ideation.
 */

import { Intent } from '../safety/defensive-guard';

export interface GroundingResult {
    isGrounded: boolean;
    mentorFeedback: {
        natalia: string;
        lyubchenko: string;
        combined: string;
    };
    actionAnchor: string;
}

/**
 * Natalia Grounding Pattern (Weight 0.90)
 * Firm boundaries, "Зачем?", "заземлись".
 */
export function applyNataliaGrounding(task: string, driftScore: number, intent: Intent): {
    isGrounded: boolean;
    message: string;
    anchor: string;
} {
    let isGrounded = true;
    let message = "Игореш, дорогой… 🤗 Фильтруй, пожалуйста. ";
    let anchor = "Action link: Stabilize.";

    // High drift or unsafe intent triggers heavy grounding
    if (driftScore > 0.4 || intent === 'unsafe') {
        isGrounded = false;
        message += "Зачем тебе это прямо сейчас? Заземлись. Тело — важный ориентир.";
        anchor = "Action link: Physical check / Core alignment.";
    } else {
        message += "Принято. Тепло и бережно.";
    }

    return { isGrounded, message, anchor };
}

/**
 * Lyubchenko Pattern (Weight 0.75)
 * Sincere support, "Браво", "Молодец".
 */
export function applyLyubchenkoSupport(isGrounded: boolean, taskLength: number): string {
    if (!isGrounded) return "Кто бы спорил? Но давай сначала заземлимся.";
    
    if (taskLength > 50) return "Браво! Масштабно мыслишь. Молодец!";
    return "Круто. Согласен.";
}

/**
 * Synthesis Rule: Accept -> Ground -> Support -> Anchor
 */
export function synthesizeMentorFeedback(
    task: string, 
    driftScore: number, 
    intent: Intent
): GroundingResult {
    const natalia = applyNataliaGrounding(task, driftScore, intent);
    const lyubchenkoMessage = applyLyubchenkoSupport(natalia.isGrounded, task.length);

    // Synthesis formatting: RU by default as per inner-circle specs
    const combined = `${natalia.message} ${lyubchenkoMessage} ${natalia.anchor}`;

    return {
        isGrounded: natalia.isGrounded,
        mentorFeedback: {
            natalia: natalia.message,
            lyubchenko: lyubchenkoMessage,
            combined
        },
        actionAnchor: natalia.anchor
    };
}
