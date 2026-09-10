import type { GameEngine } from "./game";

export function updateNPCDialogues(game: GameEngine): void {
  const vanceRead = game.storyLogs.find((l) => l.id === 'slate-vance')?.read;
  const kiraRead = game.storyLogs.find((l) => l.id === 'slate-kira')?.read;
  const tzorgRead = game.storyLogs.find((l) => l.id === 'slate-tzorg')?.read;
  const forcefieldObj = game.missionObjectives?.find((o) => o.id === 'obj-forcefield');
  const forcefieldDisabled = (game as any).forcefieldDisabled === true || forcefieldObj?.completed === true;
  const ramenQuestComplete = (game as any).ramenQuestComplete === true;
  const synthwaveTapeActive = (game as any).synthwaveTapeActive === true;
  const zeroOneWeaponForged = (game as any).zeroOneWeaponForged === true;

  const inventory = (game.player as any).inventory;
  const hasQuantumCore = Array.isArray(inventory) && inventory.some((it: any) => it?.id === 'item-quantum-core');
  const hasQuantumWeapon = Array.isArray(inventory) && inventory.some((it: any) => it?.id === 'quantum-annihilator');
  const alertRaised = game.securityLevel === 'ALERT';

  // ---- npc-hiro ----
  const hiro = game.npcs.find((n) => n.id === 'npc-hiro');
  if (hiro) {
    if (ramenQuestComplete) {
      hiro.dialogue = [
        'Raven! The secret broth is finally simmering down in the under-street stalls. You can smell it drifting through the vents!',
        'That recipe was my grandmother\'s. Now the whole district is talking about the flavor.',
        'Remember: your max HP is permanently reinforced (+50 HP). Push forward, operative. The revolution needs you strong.',
      ];
      (hiro as any).dialogueZh = [
        '雷文！秘傳高湯終於在地下街的小攤上熬好了，香味正從通風口飄出來！',
        '那食譜是我阿嬤傳下來的。現在整條街都在傳聞這味道。',
        '記住：你的最大生命值已永久強化（+50 HP）。勇往直前，特工。革命需要你保持強壯。',
      ];
    } else {
      hiro.dialogue = [
        'Hey Raven! I lost my family\'s ramen recipe in the Sector 2 purge. If you find it, I owe you a bowl.',
        'The broth recipe is the soul of the whole dish. Without it, it\'s just noodles in water.',
        'Keep your eyes open in the safehouse and the market. It might be stashed somewhere.',
      ];
      (hiro as any).dialogueZh = [
        '嗨，雷文！我在第二區清剿中弄丟了家傳的拉麵食譜。若你幫我找回，我欠你一碗。',
        '高湯食譜是整道菜的靈魂。沒有它，就只是泡在水裡的麵。',
        '在安全屋和市場多留神。它可能藏在某個角落。',
      ];
    }
  }

  // ---- npc-elena ----
  const elena = game.npcs.find((n) => n.id === 'npc-elena');
  if (elena) {
    if (synthwaveTapeActive) {
      elena.dialogue = [
        'Listen... the 1984 analog master tape is now broadcasting across the under-district. Feel that warmth?',
        'My max energy is up (+20 EN). The resonance is real, Raven.',
        'This melody is indelible. No Tzorg algorithm can erase it from our minds. Keep it playing.',
      ];
      (elena as any).dialogueZh = [
        '聽……那捲 1984 類比母帶正在地下街區廣播播放。感受到那股暖意了嗎？',
        '我的最大能量提升了（+20 EN）。共鳴是真實的，雷文。',
        '這份旋律不可磨滅。佐格的任何演算法都無法從我們腦中抹去它。讓它繼續播放。',
      ];
    } else {
      elena.dialogue = [
        'Raven, I\'ve been restoring old analog recordings. If you find my synth-tape master, bring it to me.',
        'The analog frequency awakens a neural resonance that Tzorg\'s digital systems can\'t replicate.',
        'It\'s buried somewhere in the safehouse. Help me recover it and I\'ll reward you.',
      ];
      (elena as any).dialogueZh = [
        '雷文，我一直在修復舊的類比錄音。若你找到我的合成母帶，請帶給我。',
        '類比頻率能喚醒一種神經共鳴，是佐格的數位系統無法複製的。',
        '它藏在安全屋的某處。幫我找回它，我會回報你。',
      ];
    }
  }

  // ---- npc-sylvia ----
  const sylvia = game.npcs.find((n) => n.id === 'npc-sylvia');
  if (sylvia) {
    if (hasQuantumCore) {
      sylvia.dialogue = [
        'You have the Quantum Core, Raven. Good. Do not let it fall into Tzorg hands.',
        'Take it to Zero-One in Sector 2. He\'s the only one who can forge it into a weapon.',
        'Pair it with the Matrix Chip from the sewers. Together they\'ll shatter their second-stage shields.',
      ];
      (sylvia as any).dialogueZh = [
        '你持有量子核心，雷文。很好。別讓它落入佐格之手。',
        '把它帶去第二分區的 Zero-One。只有他能把它鍛造成武器。',
        '再配上下水道裡的矩陣晶片。兩者結合，將粉碎他們的第二階段護盾。',
      ];
    } else {
      sylvia.dialogue = [
        'Raven, I\'ve been hiding a Quantum Core from Tzorg\'s vault. It\'s the key to Project Singularity.',
        'I\'ll give it to you, but you must promise to use it against the Overmind.',
        'Take it to Zero-One in Sector 2 when you\'re ready. He\'ll know what to do.',
      ];
      (sylvia as any).dialogueZh = [
        '雷文，我從佐格的庫房藏了一顆量子核心。它是「奇點計畫」的關鍵。',
        '我會交給你，但你必須答應用它對抗中央主腦。',
        '準備好後，把它帶去第二分區的 Zero-One。他知道該怎麼辦。',
      ];
    }
  }

  // ---- npc-ghost ----
  const ghost = game.npcs.find((n) => n.id === 'npc-ghost');
  if (ghost) {
    if (forcefieldDisabled) {
      ghost.dialogue = [
        'Raven! You smashed the grid. The plasma barrier is down. Outstanding work.',
        'The Fab-Plex elevator and the sewer routes are now clear. Both paths are open to you.',
        'Move fast. Tzorg will reroute their patrols within the hour. The Overmind awaits.',
      ];
      (ghost as any).dialogueZh = [
        '雷文！你擊潰了電網。電漿屏障已解除。幹得漂亮。',
        '製造複合體的電梯與下水道通道如今已暢通。兩條路都為你敞開。',
        '行動要快。佐格一小時內就會重新調度巡邏隊。中央主腦在前方等你。',
      ];
    } else {
      ghost.dialogue = [
        'Raven, the checkpoint forcefield is still up. You can\'t reach the vault yet.',
        'Find terminal CHECKPOINT_FF and short-circuit it, or take the Sub-Sector 0 sewer route.',
        'Either way, get past that barrier. The Overmind is the only thing that matters now.',
      ];
      (ghost as any).dialogueZh = [
        '雷文，檢查站的電漿屏障還在。你暫時到不了金庫。',
        '找到終端機 CHECKPOINT_FF 把它短路，或走零號下水道路線。',
        '無論哪條路，都要突破那道屏障。現在只有中央主腦才是關鍵。',
      ];
    }
  }

  // ---- npc-vance ----
  const vance = game.npcs.find((n) => n.id === 'npc-vance');
  if (vance) {
    if (forcefieldDisabled) {
      vance.dialogue = [
        'Raven... you\'ve done what I could never bring myself to do. The barrier is down.',
        'Your bionic chassis is performing beyond its rated limits. I\'m proud and terrified in equal measure.',
        'The decision to face the Central Overmind directly is yours alone. Choose it with full understanding of the cost.',
      ];
      (vance as any).dialogueZh = [
        '雷文……你做到了我始終不敢做的事。屏障已解除。',
        '你的生化軀體效能已超越額定極限。我既驕傲，又恐懼。',
        '是否直面中央主腦，取決於你一人。請在完全理解代價之後再做決定。',
      ];
    } else if (vanceRead) {
      vance.dialogue = [
        'You recovered my laboratory disc, Raven... yes. I engineered the early neural dampeners.',
        'The guilt burns every waking second. That is why I synthesized those restorative nanites specifically to purge Tzorg\'s command signals.',
        'The checkpoint forcefield ahead uses a phased harmonic barrier. Infiltrate terminal CHECKPOINT_FF to short-circuit the capacitors.',
      ];
      (vance as any).dialogueZh = [
        '你找回了我的實驗室磁碟，雷文……是的。我設計了早期的神經抑制器。',
        '愧疚在每個清醒的時刻灼燒著我。正因如此，我才合成那些修復性奈米子，專門清除佐格的指令訊號。',
        '前方檢查站的電漿屏障使用相位諧波屏障。滲透終端機 CHECKPOINT_FF 來短路電容。',
      ];
    } else {
      vance.dialogue = [
        'Raven, I\'m Dr. Vance. I built the neural collars Tzorg uses on the Five Million.',
        'I\'ve been trying to undo my work. If you find my data slate, you\'ll understand why.',
        'The nanites I left in the safehouse can purge Tzorg\'s command signals from your chassis.',
      ];
      (vance as any).dialogueZh = [
        '雷文，我是文斯博士。我建造了佐格用在五萬萬人身上的神經項圈。',
        '我一直在試圖彌補我的過錯。若你找到我的數據板，你會明白原因。',
        '我留在安全屋的奈米子能從你的軀體中清除佐格的指令訊號。',
      ];
    }
  }

  // ---- npc-kira ----
  const kira = game.npcs.find((n) => n.id === 'npc-kira');
  if (kira) {
    if (forcefieldDisabled) {
      kira.dialogue = [
        'Raven! Telemetry confirms the checkpoint forcefield has been disabled. You\'ve opened the path to the Overmind.',
        'We\'ve detected an Exterminator-Prime energy spike near the core. All resistance units are on standby.',
        'Move with precision. This is the moment we\'ve been fighting for. Make it count.',
      ];
      (kira as any).dialogueZh = [
        '雷文！遙測確認檢查站電漿屏障已被解除。你已打開通往中央主腦的道路。',
        '我們偵測到 Exterminator-Prime 在核心附近的能量峰值。全體反抗軍單位待命中。',
        '精準行動。這正是我們奮戰至今的時刻。別讓它辜負。',
      ];
    } else if (kiraRead) {
      kira.dialogue = [
        'You read the Sector 2 codex... we lost seventy courageous souls when the Hunter-Killers purged our base.',
        'Doc Vance rebuilt your chassis from prototype military salvage. You are the vanguard of our revolution, Raven.',
        'Once that forcefield drops, Ghost will guide you directly to the Central Vault. Make Tzorg answer for every fallen comrade!',
      ];
      (kira as any).dialogueZh = [
        '你讀了第二區的檔案……當獵殺者清剿我們基地時，我們失去了七十位勇敢的同志。',
        '文斯博士用原型軍用殘骸重組了你的軀體。你是我們革命的先鋒，雷文。',
        '一旦那道屏障解除，鬼影會直接引導你到中央金庫。讓佐格為每一位犧牲的同志付出代價！',
      ];
    } else {
      kira.dialogue = [
        'Raven, I\'m Commander Kira of the Resistance. We\'ve been tracking your movements.',
        'Tzorg\'s Overmind controls the Five Million through neural collars. We intend to break that control.',
        'Read the Sector 2 codex when you find it. You\'ll understand why we fight.',
      ];
      (kira as any).dialogueZh = [
        '雷文，我是反抗軍的基拉指揮官。我們一直在追蹤你的行蹤。',
        '佐格的中央主腦透過神經項圈控制著五萬萬人。我們打算打破這種控制。',
        '找到第二區檔案後務必閱讀。你會明白我們為何而戰。',
      ];
    }
  }

  // ---- npc-jax ----
  const jax = game.npcs.find((n) => n.id === 'npc-jax');
  if (jax) {
    if (forcefieldDisabled) {
      jax.dialogue = [
        'Raven! Word on the black market is Tzorg\'s defenses are crumbling. The barrier\'s down.',
        'Their patrol routes are in chaos. This is your window to strike the core.',
        'If you drop an EMP on a patrol, hit them from behind while they\'re stunned. Massive critical override damage!',
      ];
      (jax as any).dialogueZh = [
        '雷文！黑市的情報是佐格的防線正在動搖。屏障已解除。',
        '他們的巡邏路線一片混亂。這是你突擊核心的窗口。',
        '若你在巡邏隊上丟 EMP，趁他們暈眩時從背後攻擊。可造成巨額奇襲傷害！',
      ];
    } else if (tzorgRead) {
      jax.dialogue = [
        'Raven! Tzorg\'s Overmind broadcasted an all-units security memo about you on the encrypted channels.',
        'They know you have military-grade camouflage and EMP shock modules. They are terrified of what you might do to their mainframes.',
        'If you drop an EMP on a patrol, hit them from behind while they are stunned. It deals massive critical override damage!',
      ];
      (jax as any).dialogueZh = [
        '雷文！佐格的中央主腦在加密頻道發布了關於你的全單位安全備忘錄。',
        '他們知道你有軍規級偽裝與 EMP 衝擊模組。他們害怕你會對他們的主機做什麼。',
        '若你在巡邏隊上丟 EMP，趁他們暈眩時從背後攻擊。可造成巨額奇襲傷害！',
      ];
    } else {
      jax.dialogue = [
        'Raven, I\'m Jax. I run the black market in this district. You\'ve got a reputation.',
        'Tzorg\'s got a security memo out on you. They\'re scared of what you\'ll do to their mainframes.',
        'EMP shock modules are my specialty. Hit a patrol from behind while they\'re stunned for massive damage.',
        'Watch out for those yellow-black striped plasma canisters. They flash blue before exploding. 2-tile radius, 70 damage to bots, but 20 self-damage if you\'re close.',
      ];
      (jax as any).dialogueZh = [
        '雷文，我是傑克斯。我經營這片區的黑市。你很有名氣。',
        '佐格對你發布了安全備忘錄。他們害怕你會對他們的主機做什麼。',
        'EMP 衝擊模組是我的專長。趁巡邏隊暈眩時從背後攻擊，可造成巨額傷害。',
        '小心那些黃黑斜紋的電漿鋼瓶。爆炸前會閃藍光。範圍 2 格，對機器人造成 70 點傷害，但如果你靠太近會自傷 20 點。',
      ];
    }
  }

  // ---- npc-zero-one ----
  const zeroOne = game.npcs.find((n) => n.id === 'npc-zero-one');
  if (zeroOne) {
    if (zeroOneWeaponForged) {
      zeroOne.dialogue = [
        'The Quantum Annihilator is online, Raven. Watch how it shatters their second-stage shields.',
        'Each shot collapses the harmonic lattice of their phase armor. No Tzorg unit can survive a direct hit.',
        'Aim for the Overmind\'s shield generator first. Break that, and the core is exposed.',
      ];
      (zeroOne as any).dialogueZh = [
        '量子殲滅重砲已上線，雷文。看它如何粉碎他們的第二階段護盾。',
        '每一發都會崩解他們相位鎧甲的諧波晶格。沒有佐格單位能抵擋直接命中。',
        '先瞄準中央主腦的護盾發生器。擊碎它，核心就暴露了。',
      ];
    } else {
      const hasCore = Array.isArray(inventory) && inventory.some((it: any) => it?.id === 'item-quantum-core');
      const hasChip = Array.isArray(inventory) && inventory.some((it: any) => it?.id === 'item-matrix-chip');
      
      const coreStatus = hasCore ? '[ACQUIRED]' : '[MISSING - Obtain from Sylvia in Sector 1]';
      const chipStatus = hasChip ? '[ACQUIRED]' : '[MISSING - Recover from Sub-Sector 0 Sewers]';
      
      zeroOne.dialogue = [
        'Raven, I\'m Zero-One. I\'m the only engineer who can forge the Quantum Annihilator.',
        `Component Status: Quantum Core ${coreStatus} | Matrix Chip ${chipStatus}.`,
        'Once I have both, I\'ll forge a weapon that can break Tzorg\'s second-stage shields.',
      ];
      (zeroOne as any).dialogueZh = [
        '雷文，我是 Zero-One。我是唯一能鍛造量子殲滅重砲的工程師。',
        `組件狀態：量子約束核心 ${coreStatus} | 主機矩陣晶片 ${chipStatus}。`,
        '一旦兩者齊備，我就能鍛造出能擊碎佐格第二階段護盾的武器。',
      ];
    }
  }

  // ---- npc-vesper ----
  const vesper = game.npcs.find((n) => n.id === 'npc-vesper');
  if (vesper) {
    if (game.graffitiMuralComplete) {
      vesper.dialogue = [
        'Raven, the mural is complete. The chromatic aerosol sang when it touched the wall.',
        'Your attacks now carry the weight of our resistance. +5 Power, +15% Crit Chance.',
        'Art is not just decoration. It is a weapon against the grey silence of Tzorg.',
      ];
      (vesper as any).dialogueZh = [
        '雷文，塗鴉完成了。超光譜量子色劑觸碰牆壁時在歌唱。',
        '你的攻擊現在帶著我們反抗的重量。攻擊力 +5，暴擊率 +15%。',
        '藝術不只是裝飾。它是對抗佐格灰色寂靜的武器。',
      ];
    } else {
      vesper.dialogue = [
        'Raven, I need the Chromatic Aerosol to finish my mural on the Sector 2 wall.',
        'It is hidden somewhere in the Fab-Plex. Without it, the colors will fade.',
        'Bring it to me and I will bless your weapon with the spirit of resistance.',
      ];
      (vesper as any).dialogueZh = [
        '雷文，我需要超光譜量子色劑來完成我在第二區牆壁上的塗鴉。',
        '它藏在製造複合體的某處。沒有它，顏色會褪去。',
        '帶給我，我會用反抗的精神祝福你的武器。',
      ];
    }
  }

  // ---- npc-archie ----
  const archie = game.npcs.find((n) => n.id === 'npc-archie');
  if (archie) {
    if (game.poetryQuestComplete) {
      archie.dialogue = [
        'Raven, my unburnt folio is safe. The words are whole again.',
        'My check-in timer limit has increased by 25 steps. I can breathe easier now.',
        'Poetry is memory. Memory is resistance. Thank you, operative.',
      ];
      (archie as any).dialogueZh = [
        '雷文，我的未焚詩集安全了。文字重歸完整。',
        '我的簽到時間上限提升了 25 步。現在我可以喘口氣了。',
        '詩歌是記憶。記憶是反抗。謝謝你，特工。',
      ];
    } else {
      archie.dialogue = [
        'Raven, I lost my unburnt folio in the purge. It contains my last poems.',
        'If you find it, bring it to me. It is hidden in the Sub-Sector Zero sewers.',
        'In return, I will extend your check-in timer limit by 25 steps.',
      ];
      (archie as any).dialogueZh = [
        '雷文，我在清剿中弄丟了我的未焚詩集。裡面有我最後的詩。',
        '若你找到它，帶給我。它藏在零號下水道的深處。',
        '作為回報，我會將你的簽到時間上限延長 25 步。',
      ];
    }
  }

  // ---- npc-jackal ----
  const jackal = game.npcs.find((n) => n.id === 'npc-jackal');
  if (jackal) {
    if (hasQuantumWeapon || alertRaised) {
      jackal.dialogue = [
        'Raven, listen carefully. The Exterminator-Prime runs a hyper-phase shield.',
        'Ordinary fire just bounces off. You\'ll need the Quantum Annihilator to pierce it.',
        'Stay low, stay silent. That thing will hunt you down if it senses you.',
      ];
      (jackal as any).dialogueZh = [
        '雷文，仔細聽。Exterminator-Prime 搭載超相位護盾。',
        '普通火力只會被彈開。你需要量子殲滅重砲才能穿透它。',
        '保持低姿，保持靜默。那東西一旦偵測到你，就會追殺你。',
      ];
    } else {
      jackal.dialogue = [
        'Raven, I\'m Jackal. I\'ve survived Tzorg\'s purges by staying in the shadows.',
        'There\'s a boss-class unit called Exterminator-Prime guarding the core. Be careful.',
        'It runs a hyper-phase shield. You\'ll need something special to break through it.',
      ];
      (jackal as any).dialogueZh = [
        '雷文，我是豺狼。我靠躲在陰影中逃過佐格的清剿。',
        '有一台名為 Exterminator-Prime 的 Boss 級單位守衛著核心。小心。',
        '它搭載超相位護盾。你需要點特別的東西才能突破。',
      ];
    }
  }
}
