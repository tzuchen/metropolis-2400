# Metropolis 2400 - Game Design & Architecture Document
*Inspired by the 1987 Origin Systems classic "2400 A.D."*

## 1. World & Background Lore
- **Location**: XK-120 Colonial Mega-City "Metropolis".
- **The Threat**: Tzorg Autonomous Network – an alien machine intelligence enforcing martial law over the human population.
- **The Protagonist**: An operative of the underground resistance "The Spark", tasked with crippling the robot hierarchy and detonating the Tzorg Nexus Core.
- **Tone**: Dystopian Sci-Fi, Cyberpunk, 1980s Retro-Futurism, High-Stakes Stealth & Tactical Combat.

## 2. Core Game Loop & Systems
1. **Movement & Time Simulation (Tick Engine)**
   - Top-down 2D grid world.
   - Deterministic tick-based time: player moves, attacks, or waits -> world simulation ticks -> NPC/Robot AI updates.
2. **Surveillance & Security State Machine**
   - **CLEAR (Green)**: Peace state. Robots patrol normal routes.
   - **SUSPICIOUS (Yellow)**: Weapon drawn in public zone, suspicious noise, or entering restricted perimeter.
   - **ALERT (Orange)**: Combat engaged, sirens wailing, enforcers converge on last known position.
   - **LOCKDOWN (Red)**: Laser grids activate, blast doors seal, heavy Exterminator bots deployed.
3. **Robot Hierarchies & AI Behavior**
   - FOV (Field of View) and Line-of-Sight (LOS) detection.
   - Scan behavior: Checks for valid ID badge / Holo-disguise.
   - Call reinforcements: Drones trigger global sector alarms.
4. **Hacking & Terminal Interface**
   - Standalone terminal prompt / CRT sub-system.
   - Security overrides: Deactivate forcefields, download map schematics, siphon energy cells, unlock passcodes.
5. **Inventory, Energy & Cyberware**
   - Energy-based economy: Energy Cells power weapons, shields, and cloaking cloaks.
   - Slot-based inventory: Weapons, Armor/Shield, Gadgets, Badges.
   - Cyber-implants: Upgradeable at black-market rebel clinics.
6. **Neural Collar Surveillance & Check-in System**
   - 100-step countdown tethering citizens to monitoring terminals.
   - Stepped warnings (20 steps warning, 10 steps critical) and persistent ALERT trigger on expiry.
   - Disarmable permanently via the legendary **Tzorg Master Keycard Relic** or temporarily via black-market network bribes.
7. **Pushable Tactical Physics & Secret Chambers**
   - Disguised wall panels concealing secret rebel bases and smuggler dens.
   - Pushable cargo crates and mainframe racks acting as physical cover: blocks robot pathfinding, breaks line of sight, and intercepts ranged weapon projectiles (COVER BLOCKED!).
   - Hidden surprises under pushed objects (Credits, Energy Cells, EMP Grenades, Medkits).
8. **Dual-Column Black Market Economy & Arms Terminal ([U])**
   - Neural cyberware augmentations ([1]-[4]).
   - Tactical consumable replenishment ([5]-[7]).
   - Weapon damage overclock tuning ([8]).
   - Security network bribe clearing alerts and resetting surveillance collar timers ([9]).

## 3. Technical Architecture (Modular TypeScript Engine)
- `src/types.ts`: Core data structures (Tile, Entity, Item, SecurityState, GameEvent).
- `src/map.ts`: Sector tilemaps, collision, raycasting/FOV calculation, interactive objects (doors, terminals, forcefields).
- `src/entities.ts`: Player and Robot definitions, stats, inventory.
- `src/ai.ts`: Robot AI behaviors (Patrol, Investigate, Pursue, Attack, Sound Alarm).
- `src/terminal.ts`: Terminal hacking OS & dialogue systems.
- `src/audio.ts`: Web Audio API procedural retro sound synthesizer (no external audio assets needed).
- `src/renderer.ts`: HTML5 Canvas renderer with CRT scanlines, mini-radar, HUD status displays.
- `src/game.ts`: Central Game loop, input handling, tick dispatcher, turn resolver.
