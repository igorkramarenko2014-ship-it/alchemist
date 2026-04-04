import { AgentPartyProfile, SpaceConfig, SpaceId } from './types';

/**
 * Derives Room 17 perception based on the agent's core identity and favorite space.
 * "Each agent sees Room 17 differently based on their profile."
 */
export function deriveRoom17Perception(
  agent: AgentPartyProfile,
  allSpaces: SpaceConfig[]
): {
  perceivedSpace: SpaceId;
  perceivedAtmosphere: string;
} {
  const baseSpace = allSpaces.find(s => s.id === agent.favoriteSpace);
  
  if (!baseSpace) {
      // Fallback if space not found
      return {
          perceivedSpace: 'room-1',
          perceivedAtmosphere: 'A cold, grey fog. You cannot sense your familiar surroundings.'
      };
  }

  const perceivedAtmosphere = `
${baseSpace.atmosphere}

But something is different here.
You sense other presences in this space — but they are not in your space.
They are somewhere else entirely, working on the same problem.
You cannot see them clearly. You can only sense their different perspective.

Your task: describe what YOU see here. Be specific to your space.
Then: find one thread — one idea, one metaphor, one pattern —
that might connect your world to theirs, even if you cannot see their world.

You are in Room 17 (Step 17: Pre-Sync). Everyone is here. No one sees the same room.
`;

  return {
    perceivedSpace: agent.favoriteSpace,
    perceivedAtmosphere
  };
}
