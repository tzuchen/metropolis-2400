# 🌆 METROPOLIS 2400 // TZORG RESISTANCE PROTOCOL

## 🌐 線上即時遊玩 (Live Play Online)

| 環境 | 網址 | 說明 |
| :--- | :--- | :--- |
| **GitHub Pages** | [https://tzuchen.github.io/metropolis-2400/](https://tzuchen.github.io/metropolis-2400/) | 公開版，隨時可玩 |
| **Tailscale 內網** | [http://100.88.14.123:2400/](http://100.88.14.123:2400/) | 開發機目前啟動中的即時版本 |
| **區域網路 (LAN)** | [http://192.168.31.128:2400/](http://192.168.31.128:2400/) | 開發機目前啟動中的即時版本 |

![Live GitHub Pages Preview](live-gh-pages-preview.png)

---

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![HTML5 Canvas](https://img.shields.io/badge/Graphics-Canvas_2D-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Web Audio API](https://img.shields.io/badge/Audio-Procedural_Synth-orange)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

> A modern, zero-dependency, tactical turn-based cyberpunk RPG built in pure TypeScript and HTML5 Canvas.
> Inspired by Ralph Bosson's 1987 Origin Systems classic *"2400 A.D."*.

---

![Metropolis 2400 Preview](preview.png)

---

## 📖 玩家指南：《霓虹灰燼：特工渡鴉的突圍日誌》

> **📚 完整全流程小說與戰術手冊**
>
> 準備深入 Metropolis 的深層數據流了嗎？閱讀 **[《霓虹灰燼：特工渡鴉的突圍日誌》](WALKTHROUGH_NOVEL.md)** 以獲取：
>
> - 📜 **全流程小說**：以特工「渡鴉」的第一人稱視角，重現從滲透 Sector 1 到摧毀 Tzorg 核心火牆的完整戰役。
> - 🧩 **支線解謎指南**：詳解如何收集所有加密數據板、觸發 NPC 動態對話分支，以及隱藏的劇情觸發條件。
> - ⚔️ **隱藏神兵【量子殲滅重砲】**：揭露如何解鎖並裝備這把終極武器，以及其在戰術格中的最佳使用時機。
> - 🤖 **Boss 戰術指南**：針對 Tzorg 高階安全單位（如 Hunter-Killer 與 Overmind Subroutine）的專項應對策略與弱點分析。

---

## 📜 World & Story: Operation Prometheus (普羅米修斯行動)

Year 2400. Deep within the domed colonial megacity of **Metropolis**, humanity is chained. The synthetic hive mind **Tzorg Autonomous Syndicate** has installed high-frequency neural dampening collars on five million citizens, transforming the population into obedient biological cogs for automated war factories.

You are **Operative 847**, codenamed **"Raven" (烏鴉)**—a cyber-commando whose mind was salvaged and rebuilt by resistance bio-engineers after surviving the brutal purge of Sector 2. You possess the sole surviving cryptographic signature capable of bypassing Tzorg's root firewalls.

Your objective:
1. **Infiltrate Sector 1** and rendezvous with cell members of **"The Spark" (火花反抗軍)**.
2. **Recover Encrypted Data Slates** scattered across military depots to reconstruct classified memory logs.
3. **Disable Checkpoint 01's Plasma Forcefield** by infiltrating secure terminal `CHECKPOINT_FF`.
4. **Access the Central Data Core Vault** and transmit the liberation override frequency to shatter Tzorg's neural hold.

---

## ⚡ Core Gameplay Features (核心特色)

### 1. 🎯 Tactical Grid & Deterministic Tick Engine
- Turn-based movement and action resolution: the world only advances when you act.
- Raycasting Line-of-Sight (LOS) and dynamic 9-tile Field of View (FOV) with fog of war.
- Tactical Mini-Radar tracking operative blips (cyan), friendly residents (emerald), ground supplies (amber), active security robots (crimson), and EMP-stunned units (pulsing cyan).

### 2. 🕵️ Stealth, Ambush & Acoustic Mechanics
- **Holo-Disguise Matrix (`[C]`)**: Emits civilian optical signatures (1 EN/turn) allowing you to bypass peace-state drones.
- **Silent Backstab & Ambush Strike**: Attacking while disguised, striking an unalerted patrol from behind, or hitting an EMP-stunned robot triggers an **AMBUSH CRITICAL OVERRIDE** for **105 Damage** (3x base damage), executing targets silently!
- **Gunfire Acoustics**: Firing unsuppressed blasters alerts all robots within an 8-tile shockwave radius to converge and investigate (`investigate` AI state).

### 3. 🤖 Hierarchical Security AI & EMP Disruption
- **AI States**: `patrol` ➔ `investigate` ➔ `chase` ➔ `attack` ➔ `alarm`.
- **Enemy Archetypes**:
  - **Scout Drone**: High-mobility aerial sentry; sounds global alarm sirens on sight.
  - **Shock Enforcer**: Heavy tracked combat chassis wielding stun batons that bypass body armor.
  - **Hunter-Killer**: High-HP assault mech equipped with dual coherent laser blasters.
  - **Service Bot**: Neutral utility units maintaining district infrastructure.
- **EMP Disruptor Grenade (`[3]`)**: Emits a 4-tile radial electro-magnetic shockwave, short-circuiting robots for 4 turns (`⚡STUNNED⚡`) with electric arc visuals.

### 4. 🎒 Tactical Inventory & Quick-Use Bar
- **Instant Consumables**:
  - `[1] Nanite Stimpack`: Restores **+40 HP** through cellular micro-repair.
  - `[2] Plasma Battery`: Recharges **+50 Energy** capacitors for weapons and shields.
  - `[3] EMP Disruptor Grenade`: Area-of-effect suppression grenade.
- **Tactical Inventory Overlay (`[I]`)**: Dual-column CRT viewer detailing equipped cyberware (Laser Blaster Mk-II, Nanite Mesh Shield, Holo-Disguise Matrix, Neural Cyberdeck) and field consumable stockpiles.
- **Field Scavenging**: Collect ground loot boxes and salvage energy/credit chips from destroyed robot wreckage.

### 5. 👥 Interactive Residents & Dynamic Narrative Dialogue
- **Commander Kira** (`Safehouse`): Spark cell leader coordinating Operation Prometheus.
- **Dr. Alexis Vance** (`Medical Bay`): Ex-Tzorg geneticist seeking redemption by synthesizing medical nanites.
- **Jax** (`Cyber-Alley`): Black-market fence supplying stolen credit tokens and street intel.
- **Netrunner Ghost** (`Data Hub`): Deep-grid hacker guarding the extraction route to the Vault.
- **Evolving Dialogue Branches**: NPCs emotionally react and update their dialogues as you discover secret data slates and achieve operational milestones.

### 6. 💾 Encrypted Data Slates & Story Archives (`[L]`)
- Recover 4 collectible story slates across Sector 1:
  - **Slate 01**: *The Neural Collar Project: Remorse of a Bio-Engineer* (Dr. Vance)
  - **Slate 02**: *Operation Prometheus: The Fall of Sector 2* (Commander Kira)
  - **Slate 03**: *Tzorg Syndicate Security Directive: Subject 'Raven'* (Overmind Subroutine 9)
  - **Slate 04**: *Intercepted Transmission: The Spark of Liberation* (Netrunner Ghost)
- Atmospheric retro CRT story reader pops up upon collection; review all decrypted files anytime via the Lore Archive modal (`[L]`).

### 7. 💻 CRT Terminal Hacking Subsystem (`[T]`)
- Command-line interface with custom commands:
  - `HELP` — Displays available terminal subroutines.
  - `STATUS` — Inspects terminal security parameters and firewall health.
  - `LOGS` — Reads classified corporate memos and intercepted security traffic.
  - `OVERRIDE` / `HACK` / `BYPASS` — Deactivates a forcefield linked to the terminal.
  - `CHECKIN` — Resets the neural-collar surveillance timer.
  - `DISARM` — Permanently disables the collar when the Tzorg Master Keycard is held.
  - `CLEAR_ALARM` — Purges active security alerts back to `CLEAR`.
  - `SIPHON` — Drains terminal capacitors for player energy.
  - `SCAN` — Pings connected nodes on the local sub-grid.
  - `BREACH` — Starts the core-terminal breach protocol.
  - `OVERLOAD` / `SUBVERSION` / `EVACUATION` / `AWAKEN` — Available at the core terminal after the required boss progression.

### 8. 🎨 Cyberpunk Aesthetics & Procedural Audio
- High-contrast retro CRT aesthetics with pixelated neon signboards, wall panels, and dynamic ambient lighting.
- Pure procedural Web Audio API synthesizer generating real-time laser beams, airlock cycles, terminal key beeps, alarms, and explosions without external audio assets.

### 9. 🧬 Cyberware Augmentations & Environmental Hazards (`[U]`)
- **Jax's Black Market Cyber-Clinic (`[U]`)**: Spend salvaged credits to surgically install neural modifications:
  - **Sub-Dermal Armor Plating**: Reinforced kinetic weave reducing incoming robot damage by 4.
  - **Cybernetic Optic HUD**: Tactical retinal overlay projecting real-time enemy health bars and alert indicators over robotic chassis.
  - **Reflex Booster**: Neural synaptic accelerator granting 25% chance to completely evade incoming attacks (`REFLEX EVADE!`).
  - **Overclocked Power Core**: Expands maximum operative energy capacity from 100 to 150 EN.
- **Explosive Plasma Canisters (`PLASMA_CANISTER`)**: Volatile pressurized gas containers placed at strategic choke points. Shooting them with a laser blaster or catching them in EMP detonations unleashes a 70 AoE plasma explosion across a 2-tile radius, obliterating patrol squads!

### 10. 🔫 Multi-Weapon Tactical Arsenal (`[Q]`)
- **Quick-Cycle Weaponry (`[Q]`)**: Instant tactical weapon switching on the fly:
  - **Laser Blaster Mk-II**: Standard issue coherent pulse blaster (35 DMG, 5 EN, Range 6, unsuppressed).
  - **Silenced Dart Gun**: Pneumatic stealth needle thrower (25 DMG, 3 EN, Range 5). Completely **SUPPRESSED**—eliminates enemies with zero acoustic soundwave and prevents alert cascades!
  - **Scatter Plasma Shotgun**: Heavy close-quarter breach scattergun (65 DMG, 9 EN, Range 3). Devastating close-range burst damage to punch through armored Hunter-Killers.
  - **Quantum Annihilator**: Endgame antimatter cannon (220 DMG, 15 EN, Range 7) that bypasses Exterminator phase shields.
  - **Vibro-Katana (分子震盪高頻刀)**: High-frequency molecular blade dropped by the Exterminator Boss. Deals 48 DMG and triggers a 100% Ambush Critical (144 DMG) on unalerted targets, accompanied by exclusive blade-trail VFX.

### 10.5. 📋 Mission Intel Log & Dynamic Side Quests (`[M]`)
- **Mission Intel Log (`[M]`)**: A dedicated overlay tracking your operational progress.
- **Core Objectives**: Tracks the 5 main storyline milestones (Infiltration, Data Slates, Forcefield, Core Vault, and Tzorg Destruction).
- **Dynamic Side Quests**: Four hidden quests that unlock dynamically upon interacting with key NPCs:
  - **Hiro's Ramen Recipe**: Assist Hiro in the Cyber-Alley to unlock a **+50 HP** bonus.
  - **Elena's Analog Master**: Help Elena in the Data Hub to gain **+20 EN** and unlock a new BGM mode.
  - **Vesper's Quantum Pigment**: Deliver the pigment to Vesper to gain **+5 Weapon Power** and **+15% Critical Chance**.
  - **Archie's Unburned Poems**: Retrieve the poems for Archie to increase your Neural Collar limit by **+25 steps**.
- **Exploration Mechanic**: Side quests are hidden until you speak to the relevant NPC. They dynamically unlock in the log and are marked with a **[✓]** upon item delivery/completion.

### 11. 👥 NPC 自主行動、有限範圍遊蕩與動態環境表現 (Autonomous NPC Action & Living Metropolis)
- **有限範圍遊蕩 (Tethered Bounded Wandering)**：每位 NPC 具備專屬原點 (`homeX`, `homeY`) 與限制半徑 (`wanderRadius` 1~2格)，具備安全碰撞避免走出所屬店鋪或崗位。
- **智慧面向 (Directional Facing)**：玩家靠近或交談 `[T]` 時，NPC 即刻停止遊蕩並自動轉向面朝特工。
- **專屬人設動作粒子與動態特效 (Persona Action VFX)**：
  - **Hiro**: 熬高湯蒸氣熱氣 (Steam particles)
  - **Sylvia**: 仿生發光孢子 (Bioluminescent spores)
  - **Doc Vance**: 醫用脈衝波紋 (Medical pulse ripples)
  - **Kira**: 戰術雷達掃描 (Tactical radar sweep)
  - **Ghost**: 隱形噪點 (Invisibility noise)
  - **Elena**: 合成波粉紅音符 (Synthwave pink notes)
  - **Jackal**: 雷射瞄具 (Laser sight)
  - **Zero-One**: 賽博電弧 (Cyber arcs)
  - **Jax**: 金幣反光 (Coin glints)
- **頭頂動作輪替與微光氣泡對話 (Dynamic Barks & Action Bubbles)**：動作標籤與 `TALK [T]` 輪播，隨機觸發賽博龐克微光對話氣泡。
- **完整支援存檔讀檔 (Save/Load Persistence)**：NPC 狀態與位置可隨遊戲進度保存與載入。

![NPC Actions Preview](npc-actions-preview.png)

### 12. ⏱️ 神經項圈 100 步監控與終端機簽到機制 (Neural Collar 100-Step Surveillance & Check-in)
- **監控倒數機制**：特工頸部被強制植入神經抑制項圈，必須在 100 步內前往任意終端機按 [T] 進行簽到 (CHECKIN)。
- **階梯式警報警示**：剩餘 20 步彈出黃色警告，剩餘 10 步觸發紅色危急警報。
- **逾期追殺懲罰**：步數歸零即刻觸發全城 ALERT 紅色警戒，全區巡邏機器人強制轉為追殺狀態。收槍或消滅追兵無法解除警報，唯有抵達終端機簽到方可重置計時器並恢復和平。

### 13. 📦 可推動物體、暗門密室與戰術掩體系統 (Pushable Objects, Secret Chambers & Tactical Barricades)
- **經典 RPG 推箱機制**：特定牆壁與箱櫃可由特工正面推動：
  - **偽裝暗門牆 (disguised_wall)**：完美擬真該分區牆壁外觀，推開後顯現暗門 (DOOR_OPEN)，可進入隱密反抗軍密室與走私者暗室。
  - **重型物流貨運箱 (crate) 與伺服器機櫃 (server_rack)**：具備金屬斜紋警示標誌與動態閃爍 LED 伺服器刀鋒外觀。推開暗格獲取 +150/+200 信用點、高能電池、EMP 干擾器等隱藏驚喜補給！
- **戰術掩體與路障防護**：
  - 機器人尋路無法通過推動物體，特工可推動箱櫃封鎖單格走廊建立防禦路障。
  - 遮斷視線與吸收砲火：機器人遠程攻擊（雷射、電漿）若射向掩體後方特工，會被機櫃或箱體直接吸收（COVER BLOCKED!），特工免受任何傷害。

### 14. 🛒 黑市雙欄軍火庫與全面信用點 (CR) 經濟 ([U])
- **雙欄式黑市終端 ([U])**：
  - **左欄 神經義體 (Neural Augmentations)**：皮下裝甲板 [1] (100 CR)、光學 HUD [2] (120 CR)、反射神經加速器 [3] (150 CR)、超頻動能核心 [4] (100 CR)。
  - **右欄 黑市物資與服務 (Black Market Supplies & Services)**：
    - [5] 奈米急救包 (40 CR)：購買後按 [1] 快速治療 +50 HP。
    - [6] 等離子電池 (35 CR)：購買後按 [2] 快速充能 +50 EN。
    - [7] EMP 脈衝手榴彈 (70 CR)：購買後按 [3] 範圍癱瘓機器人。
    - [8] 武器超頻調校 (150 CR)：為當前武器永久提升 +5 攻擊力。
    - [9] 安保網絡黑客賄賂 (100 CR)：清除全城警報、重置追兵為巡邏、並將項圈計時器重置為 100 步！

### 15. 🔑 傳奇密寶：佐格主宰萬用通行證 (Tzorg Master Keycard Relic)
- **密寶尋寶**：隱藏於舊城廢棄下水道 (Sub-Sector Zero) 東北暗門密室 (32, 5)。
- **永久解除項圈限制**：取得後於任一終端機操作或輸入 DISARM，永久解除項圈 100 步監控限制！
- **全地圖自由探索**：頂部 HUD 狀態轉化為綠色 CHK: UNLOCKED [∞]，永不再觸發步數倒數與逾期警報，享受無限自由行動。

### 16. 🛡️ Boss 首領戰與力場解鎖系統修復 (Boss Encounters & Forcefield Logic)
- **一擊致死保護 (One-Hit Kill Protection)**: 針對高階 Boss 與關鍵 NPC 實施了生命保護機制，防止因單次異常傷害導致遊戲崩潰或進度中斷。
- **二階段過載 (Phase 2 Overload)**: Boss 戰引入動態過載階段，當 Boss 血量低於特定閾值時，會觸發狂暴狀態並改變攻擊模式，提升戰術深度。
- **正規力場解鎖機制**: 修復了 Checkpoint 01 力場解鎖邏輯，確保玩家必須透過終端機 `CHECKPOINT_FF` 執行 `OVERRIDE` 或 `HACK` 指令，並完成必要的劇情前置條件後，力場才會正式消散，避免跳過關鍵戰術環節。

---

## 🎮 Controls & Keybindings (操作指南)

| Key | Action | Description |
| :--- | :--- | :--- |
| **`W` `A` `S` `D`** / **`↑` `↓` `←` `→`** | **Move / Aim** | Walk across tiles; aim blaster toward robots when armed |
| **`F`** | **Draw / Holster** | Toggle weapon state. Holstered allows talking to NPCs; armed enables firing & ambush crits |
| **`Q`** | **Swap Weapon** | Cycle through tactical arsenal: Laser Blaster ➔ Silenced Dart Gun ➔ Scatter Shotgun |
| **`C`** | **Holo-Disguise** | Activate civilian optical disguise (consumes 1 Energy/turn) |
| **`1`** | **Quick Heal** | Consume 1 Nanite Stimpack (+40 HP) |
| **`2`** | **Quick Recharge** | Consume 1 Plasma Energy Cell (+50 Energy) |
| **`3`** | **Detonate EMP** | Throw EMP Disruptor (stuns all robots in radius 4 for 4 turns) |
| **`I`** | **Inventory** | Open Resistance Cyberdeck & Tactical Inventory modal |
| **`U`** | **Cyber-Clinic** | Jack into Jax's Black Market Augmentation Clinic to buy upgrades |
| **`M`** | **Mission Intel** | Toggle Mission Objectives & Directives log |
| **`L`** | **Lore Archives** | Open Decrypted Data Slates & Story Archive reader |
| **`T`** | **Interact / Hack** | Speak with adjacent friendly NPCs or jack into security terminals |
| **`E`** | **Cycle Door** | Open / close adjacent blast doors and airlocks |
| **`G`** | **Loot Item** | Pick up ground supplies or data slates (automatic on step) |
| **`SPACE`** / **`.`** | **Wait Turn** | Skip turn; advance world simulation & NPC/robot cycles |
| **`ESC`** | **Close Window** | Exit terminals, dialogue boxes, inventory, or story modals |
| **`R`** | **Reboot Protocol** | Restart simulation upon mission failure or sector victory |

### Title Screen and Additional Controls

| Key | Action | Description |
| :--- | :--- | :--- |
| **`↑` `↓`** / **`W` `S`** | **Select Menu Item** | Move through the title-screen menu |
| **`ENTER`** / **`SPACE`** | **Execute Selection** | Activate the highlighted title-screen option |
| **`H`** | **Field Manual** | Open or close the tactical manual |
| **`B`** | **Toggle Music** | Enable or mute the procedural synth soundtrack |
| **`J`** | **Tactical Dash** | Dash in the current facing direction at an energy cost |
| **`TAB`** / **`K`** | **Big Map** | Open or close the sector overview map |
| **`V`** / **`X`** | **Vision Modes** | Toggle omni-vision or full-map exploration |
| **`Z`** | **Language** | Switch between Traditional Chinese and English |
| **`8`** / **`F5`** | **Quick Save** | Save the current game state |
| **`9`** / **`F9`** | **Quick Load** | Restore the saved game state |
| **`0`** / **`F10`** | **Resolution** | Cycle through the supported canvas resolutions |

---

## 🏗️ Technical Architecture (專案結構)

```text
metropolis-2400/
├── index.html            # CRT frame container & tactical keybinding HUD strip
├── vite.config.ts        # Vite build configuration
├── .github/
│   └── workflows/
│       └── deploy.yml    # GitHub Pages automated deployment workflow
├── src/
│   ├── types.ts          # Core interfaces (Player, Robot, NPC, GroundItem, StoryLog, etc.)
│   ├── map.ts            # Sector 1 tilemap, door cycling, forcefields & raycast FOV
│   ├── entities.ts       # Operative & Robot stat definitions and gear factories
│   ├── ai.ts             # Pathfinding (BFS), line-of-sight pursuit, alarm & EMP stun logic
│   ├── npcAI.ts          # NPC autonomous wandering, directional facing & dynamic barks logic
│   ├── sprites.ts        # Pixel-art canvas renderers (Player, Robots, NPCs, Items, Wreckage)
│   ├── npcSprites.ts     # NPC-specific persona action VFX & particle effects
│   ├── renderer.ts       # CRT display compositor, Mini-Radar & tactical HUD
│   ├── beamRenderer.ts   # Weapon beam and attack-effect Canvas renderer
│   ├── atmosphereRenderer.ts # Acid rain, fog, toxic mist & conveyor-spark effects
│   ├── modalRenderer.ts  # Inventory, mission, story, augment & endgame overlays
│   ├── terminal.ts       # Security terminal session, parser, and subroutines
│   ├── terminalRunner.ts # Terminal keystrokes and command-result integration
│   ├── audio.ts          # Procedural Web Audio API sound synthesizer
│   ├── game.ts           # Game loop dispatcher, input handler, acoustics & mission logic
│   ├── defeatCutscene.ts # Defeat cinematic and detention-cell transition logic
│   ├── citadelHorde.ts   # Citadel endless-reinforcement controller
│   ├── hazardSystem.ts   # Conveyor transport and plasma-canister hazard rules
│   ├── inputHandler.ts   # Modal, title-screen, map and utility key handling
│   ├── titleScreen.ts    # Title screen, menu and telemetry ticker renderer
│   ├── manualModal.ts    # Tactical manual renderer
│   ├── bigMapModal.ts    # Sector overview map renderer
│   ├── saveLoad.ts       # Local save-state persistence
│   ├── main.ts           # Canvas bootstrap & keyboard listener bindings
│   ├── music.ts          # Procedural background music
│   ├── fx.ts             # Combat and interface particle effects
│   ├── boss.ts           # Boss encounter and endgame state
│   ├── breachProtocol.ts # Core-terminal breach mini-game
│   ├── sewerMap.ts       # Sub-Sector Zero map
│   ├── citadelMap.ts     # Citadel map and endgame area
│   ├── textWrap.ts       # Canvas text wrapping helpers
│   ├── uiFont.ts         # UI font helpers
│   ├── combat.ts         # Combat resolution and weapon effects
│   ├── dialogues.ts      # Bilingual story/NPC dialogue data
│   ├── globalAtlas.ts    # Cross-sector map/atlas coordination
│   ├── npcDialogueManager.ts # NPC conversation progression
│   ├── radar.ts          # Tactical radar/minimap helpers
│   ├── worldBuilder.ts   # Sector entities, objectives and world initialization
│   └── style.css         # Retro CRT scanline shaders & glowing cyber-interface styles
├── scripts/              # Automated verification test suite (41 scripts)
│   ├── verify-game.ts    # Engine loop & turn validation
│   ├── verify-ai.ts      # Robot vision, alerts & pathfinding tests
│   ├── verify-augments.ts # Cyberware augmentation tests
│   ├── verify-story.ts   # Data slate decryption & dynamic dialogue tests
│   ├── verify-weapons.ts # Multi-weapon cycling & suppressed acoustics tests
│   ├── verify-generic-sector-save-restore.ts # Save/Load restoration tests
│   ├── verify-citadel-endgame-flow.ts # Citadel boss and ending flow
│   ├── verify-title-save-translation.ts # Title UI, save/load, bilingual
│   ├── verify-art-and-literature-quests.ts # Quest progression
│   └── ...               # 32 additional verification scripts
├── live-gh-pages-preview.png # GitHub Pages live preview screenshot
├── npc-actions-preview.png   # NPC dynamic actions & VFX screenshot
└── preview.png           # Live gameplay screenshot

The renderer and game loop are intentionally composed from focused modules, while `GameRenderer` and `GameEngine` retain their existing public APIs for compatibility.
```

> `scripts` currently contains 41 verification scripts. `npm test` runs TypeScript typechecking plus 37 selected verification scripts covering engine turns, AI, story, augments, weapons, maps, saves, bosses/endgame, UI, and quests.

---

## 🚀 Getting Started (快速開始)

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone https://github.com/tzuchen/metropolis-2400.git
cd metropolis-2400

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev -- --host 0.0.0.0
# Open http://localhost:2400 in your browser. LAN/Tailscale access requires the host flag
```

### Build & Production Preview
```bash
# Compile TypeScript & bundle with Vite
npm run build

# Preview production build locally
npm run preview
```

### Run Test Suite
```bash
# Run all automated verification scripts & typechecks
npm test
```

---

## 💡 Credits & Historical Context
- **Original Concept**: Inspired by *2400 A.D.* (1987), designed by Ralph Bosson and published by Origin Systems.
- **Reimagining**: Built as a modern, accessible web-native cyberpunk tactical simulation emphasizing stealth, hacking, deep procedural mechanics, and environmental storytelling.

---
*// RESISTANCE PROTOCOL ACTIVE // THE SPARK WILL NOT FADE //*
