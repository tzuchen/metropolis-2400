import { GameEngine } from '../src/game';
import { generateAIPerceptionSnapshot } from '../src/aiPerception';
import * as fs from 'fs';
import * as path from 'path';

// 1. Mock headless Canvas
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: () => ({
    save: () => {},
    restore: () => {},
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    roundRect: () => {},
    measureText: () => ({ width: 10 }),
  }),
} as unknown as HTMLCanvasElement;

// 2. Read Novel Context
const novelPath = path.join(process.cwd(), 'WALKTHROUGH_NOVEL.md');
const novelFullText = fs.readFileSync(novelPath, 'utf-8');

// 3. Helper to call local SGLang Qwen 27B
async function callLocalAgent(systemPrompt: string, userPrompt: string): Promise<any> {
  const res = await fetch('http://localhost:8000/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'spark-vllm-docker',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 350,
      chat_template_kwargs: { enable_thinking: false },
    }),
  });

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // fallback
    }
  }
  return { action: 'WAIT', reasoning: raw, novel_guidance: 'parsing error' };
}

// 4. Main Simulation Loop
async function runTacticalSimulation() {
  console.log('================================================================');
  console.log('🎮 METROPOLIS 2400: AI AGENT NOVEL-GUIDED TACTICAL SIMULATION');
  console.log('================================================================\n');

  const game = new GameEngine(mockCanvas);
  game.isTitleScreen = false;
  game.isIntroBriefingOpen = false;
  game.updateFOV();

  console.log('Simulation initialized in Sector 1 (Safehouse).');
  console.log(`Initial Position: (${game.player.x}, ${game.player.y}), Collar CHK: ${game.player.checkInTimer}/100, EN: ${game.player.energy}/100\n`);

  const systemPrompt = `You are Operative Raven, an autonomous AI tactical agent playing Metropolis 2400.
You have access to your operational field manual and narrative walkthrough ("WALKTHROUGH_NOVEL.md").
Your mission is to strictly follow the novel's guidance to survive, complete objectives, and liberate Metropolis.

KEY TACTICAL RULES & NOVEL GUIDANCE:
1. You start in Sector 1 Safehouse at dynamic position (${game.player.x}, ${game.player.y}) beside Commander Kira (4, 6) and Doc Vance (7, 4).
2. The novel instructs you to first rendezvous and speak with Commander Kira (4, 6) to receive your mission directives and +40 Energy auxiliary power cells!
3. Keep your weapon holstered (isWeaponDrawn = false) when approaching and speaking to resistance members.
4. When adjacent to an NPC, move toward their tile or use TALK to initiate dialogue.
5. While dialogue is open (active_dialogue != null), choose ADVANCE_DIALOGUE to read through the briefing until completed.
6. Once dialogue finishes, explore the safehouse or approach Doc Vance (7, 4).
7. Available actions:
   - MOVE_N (y: -1), MOVE_S (y: +1), MOVE_W (x: -1), MOVE_E (x: +1)
   - TALK
   - ADVANCE_DIALOGUE
   - CLOSE_DIALOGUE
   - DRAW_WEAPON, HOLSTER_WEAPON
   - WRITE_JOURNAL:Title|Content
   - WAIT

OUTPUT STRICT JSON ONLY:
{
  "novel_guidance": "What the novel instructs you to do right now",
  "reasoning": "Your tactical reasoning based on position and status",
  "action": "ACTION_NAME"
}`;

  const maxSteps = 12;
  let lastOutcomeMessage: string | null = null;
  for (let step = 1; step <= maxSteps; step++) {
    const snapshot = generateAIPerceptionSnapshot(game);
    const p = snapshot.player;
    const activeDiag = (game as any).activeDialogue;
    let diagText = null;
    let diagNpc = null;
    let diagPage = 0;
    let diagTotal = 0;

    if (activeDiag && activeDiag.npc) {
      diagNpc = activeDiag.npc.name;
      diagPage = activeDiag.textIndex + 1;
      diagTotal = activeDiag.npc.dialogue?.length || 1;
      diagText = activeDiag.npc.dialogue?.[activeDiag.textIndex] || activeDiag.npc.dialogueZh?.[activeDiag.textIndex];
    }

    console.log(`----------------------------------------------------------------`);
    console.log(`[Turn ${step}] Pos: (${game.player.x}, ${game.player.y}) | HP: ${p.hp}/${p.max_hp} | EN: ${p.energy}/${p.max_energy} | CHK: ${p.collar_timer}/100 | Facing: ${p.facing}`);
    if (activeDiag) {
      console.log(`💬 Dialogue Open: [${diagNpc}] Page ${diagPage}/${diagTotal}: "${diagText}"`);
    }

    // Extract adjacent neighborhood info
    const adjacentInfo = snapshot.adjacent_neighborhood
      .filter(t => ['N', 'S', 'E', 'W'].includes(t.direction))
      .map(t => {
        let status = t.walkable ? 'Walkable' : 'Blocked';
        if (t.occupant) status += ` (Occupant: ${t.occupant})`;
        if (t.interactable) status += ` (Interactable: ${t.interactable})`;
        return `${t.direction}: ${status}`;
      }).join('\n');

    // Extract valid actions
    const validActionsStr = snapshot.valid_actions.join(', ');

    // Determine specific hints based on state
    let tacticalHints = '';
    if (activeDiag) {
      tacticalHints += '\n- HINT: Dialogue is active. Use ADVANCE_DIALOGUE to proceed or CLOSE_DIALOGUE to end.';
    }
    
    const nearbyNpcs = snapshot.visible_entities.npcs.filter(n => n.manhattan <= 1);
    if (nearbyNpcs.length > 0 && !activeDiag) {
      const npcNames = nearbyNpcs.map(n => n.name).join(', ');
      tacticalHints += `\n- HINT: NPC(s) adjacent: ${npcNames}. Consider using TALK or moving closer.`;
    }

    if (lastOutcomeMessage) {
      tacticalHints += `\n- PREVIOUS TURN FEEDBACK: "${lastOutcomeMessage}". If blocked, try a different direction or action.`;
    }

    const userPrompt = `Current Game State:
- Player Position: (${game.player.x}, ${game.player.y})
- Current Location: ${snapshot.current_location?.name_zh || snapshot.current_location?.name_en || 'Unknown'}
- Facing: ${p.facing}
- Weapon Drawn: ${p.is_weapon_drawn}
- Energy: ${p.energy}/${p.max_energy}
- Collar Timer: ${p.collar_timer}/100
- Active Dialogue: ${activeDiag ? `Talking to ${diagNpc} (Page ${diagPage}/${diagTotal}): "${diagText}"` : 'None'}
- Adjacent Tile Status:
${adjacentInfo}
- Valid Actions: ${validActionsStr}
- Nearby Visible NPCs:
${snapshot.visible_entities.npcs.map((n: any) => `  * NPC ${n.name || n.id} at relative (${n.dx}, ${n.dy}), absolute (${game.player.x + n.dx}, ${game.player.y + n.dy}) [distance: ${n.distance}]`).join('\n') || '  (none)'}
${tacticalHints}

What is your next move according to the novel walkthrough?`;

    const decision = await callLocalAgent(systemPrompt, userPrompt);
    console.log(`📖 Novel Guidance : ${decision.novel_guidance || 'N/A'}`);
    console.log(`🧠 Agent Thought  : ${decision.reasoning || 'N/A'}`);
    console.log(`⚡ Chosen Action  : ${decision.action}`);

    const outcome = game.executeAIAction(decision.action);
    console.log(`🎯 Outcome        : Accepted=${outcome.accepted}, Moved=${outcome.moved}, Interacted=${outcome.interacted}${outcome.message ? `, Msg="${outcome.message}"` : ''}`);
    
    lastOutcomeMessage = outcome.message || null;

    if (game.player.energy > 100) {
      console.log(`✨ REWARD VERIFIED: Operative energy is now ${game.player.energy} (received Kira's auxiliary power cells)!`);
    }

    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n================================================================');
  console.log('🏁 TACTICAL SIMULATION EXPERIMENT COMPLETE');
  console.log('================================================================');
  console.log(`Final Position: (${game.player.x}, ${game.player.y})`);
  console.log(`Final Energy: ${game.player.energy} (Initial: 100)`);
  console.log(`Collar Steps: ${game.player.checkInTimer}/100`);
  console.log(`Total Messages Emitted: ${game.messages.length}`);
  console.log(`Recent In-Game Messages:`);
  game.messages.slice(-5).forEach(m => console.log(`  - [${m.type}] ${m.text}`));
}

runTacticalSimulation().catch(err => {
  console.error('Simulation error:', err);
});
