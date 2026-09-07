import type { NPC, StoryLog } from './types';

export function getSector1NPCs(): NPC[] {
  return [
    {
      id: 'npc-kira',
      name: 'Kira',
      role: 'Spark Cell Commander',
      roleZh: '火花反抗軍指揮官',
      avatarColor: '#ff6d00',
      x: 4,
      y: 6,
      hp: 100,
      maxHp: 100,
      isAlive: true,
      dialogue: [
        'Operative! The Tzorg network has locked down Checkpoint 01 with a high-energy plasma barrier.',
        'We confirmed the forcefield is tied to terminal CHECKPOINT_FF inside the outpost. Infiltrate and override it.',
        'Use your Holo-Disguise [C] to slip past patrol drones, and keep that blaster holstered until needed.',
        'Here, take these auxiliary power cells (+40 EN). The Spark is counting on you!',
      ],
      dialogueZh: [
        '特工雷文！佐格電網已經用高能電漿屏障徹底封鎖了 01 號檢查哨。',
        '我們確認該屏障受哨站內的終端機 CHECKPOINT_FF 控制，潛入並覆寫它。',
        '使用全像偽裝 [C] 避開巡邏無人機，在必要前先按 [F] 收好武器避免引起懷疑。',
        '收下這些備用能量電池（+40 EN），火花反抗軍全靠你了！',
      ],
      questReward: {
        type: 'ENERGY',
        amount: 40,
        message: 'Kira granted +40 Energy Cells!',
      },
      rewardClaimed: false,
    },
    {
      id: 'npc-vance',
      name: 'Doc Vance',
      role: 'Cyber-Medic',
      roleZh: '反抗軍生化醫官',
      avatarColor: '#00e5ff',
      x: 7,
      y: 4,
      hp: 80,
      maxHp: 80,
      isAlive: true,
      dialogue: [
        'Good to see you breathing, operative. Let me patch your dermal plating and vital systems.',
        'Take this dose of restorative nanites (+35 HP).',
        'Watch out for the Shock Enforcers. Their electro-stuns bypass body armor completely!',
      ],
      dialogueZh: [
        '很高興看到你還活著，特工。讓我修復你的皮下金屬裝甲與生命維持系統。',
        '收下這劑高純度奈米修復針劑（+35 HP）。',
        '小心重裝電擊執法者（Shock Enforcer），他們的電擊脈衝會完全無視護甲！',
      ],
      questReward: {
        type: 'HEAL',
        amount: 35,
        message: 'Doc Vance restored +35 HP with nanites!',
      },
      rewardClaimed: false,
    },
    {
      id: 'npc-jax',
      name: 'Jax',
      role: 'Alley Informant',
      roleZh: '暗巷情報掮客',
      avatarColor: '#ffea00',
      x: 16,
      y: 6,
      hp: 70,
      maxHp: 70,
      isAlive: true,
      dialogue: [
        'Psst... keep your head down! The patrol drones have been buzzing this alley all morning.',
        'If you trip a security alert, you can clear it from any terminal by typing CLEAR_ALARM.',
        'I salvaged some credit chips from an old enforcer patrol. Take 60 Credits (+60 CR)!',
      ],
      dialogueZh: [
        '噓……低下頭！巡邏無人機整個早上都在這條暗巷附近嗡嗡作響。',
        '如果不小心觸發了安保警報，可以在任何終端機輸入 CLEAR_ALARM 解除警報。',
        '我從執法巡邏隊殘骸搜刮到一些信用點晶片，拿去吧（+60 CR）！',
      ],
      questReward: {
        type: 'CREDITS',
        amount: 60,
        message: 'Jax handed you +60 Credits!',
      },
      rewardClaimed: false,
    },
    {
      id: 'npc-hiro',
      name: 'Hiro',
      role: '商店街拉麵商',
      roleZh: '商店街拉麵商',
      avatarColor: '#ff9e00',
      x: 15,
      y: 5,
      hp: 80,
      maxHp: 80,
      isAlive: true,
      dialogue: [
        'Ah, a resistance operative! You look like you have not eaten in days.',
        'Here, a bowl of hot ramen from my stall. The broth is warm, the noodles are fresh, and the hope is real.',
        'Eat up. The streets of Sector 1 are dangerous, but a full stomach keeps the cyberware humming.',
      ],
      dialogueZh: [
        '啊，反抗軍的特工！你看起來好幾天沒吃頓像樣的熱飯了。',
        '來，一碗我攤位現煮的熱拉麵。湯頭濃郁、麵條現拉，在這絕望之城，希望是真實的。',
        '快趁熱吃吧。第一分區的街道危機四伏，吃飽肚子才能讓體內的義體核心平穩運轉。',
      ],
      questReward: {
        type: 'HEAL',
        amount: 25,
        message: 'Hiro served hot ramen (+25 HP)!',
      },
      rewardClaimed: false,
    },
    {
      id: 'npc-sylvia',
      name: 'Sylvia',
      role: '仿生公園植物學家',
      roleZh: '仿生公園植物學家',
      avatarColor: '#7cffcb',
      x: 11,
      y: 20,
      hp: 75,
      maxHp: 75,
      isAlive: true,
      dialogue: [
        'Welcome to the Bio-Park. These synthetic flora are the last green lungs of Metropolis.',
        'The Tzorg drones pollute the air, but the engineered moss filters toxins and stabilizes the dome climate.',
        'If you see plasma canisters near the canopy, do not shoot them. The spores will spread and kill everything.',
      ],
      dialogueZh: [
        '歡迎來到仿生生態公園。這些人造合成植物是這座大都會最後的綠色肺葉。',
        '佐格無人機不斷排放廢氣，多虧基因工程苔蘚過濾毒素，才維持住巨蛋穹頂的氣候平衡。',
        '如果你在林冠附近看到高壓電漿罐，千萬別開槍。引爆擴散的孢子毒氣會毀滅所有生物。',
      ],
      rewardClaimed: false,
    },
    {
      id: 'npc-ghost',
      name: 'Ghost',
      role: 'Resistance Infiltrator',
      roleZh: '反抗軍滲透幽靈',
      avatarColor: '#9d4edd',
      x: 31,
      y: 23,
      hp: 90,
      maxHp: 90,
      isAlive: true,
      dialogue: [
        'You bypassed the checkpoint forcefield! Outstanding infiltration, operative.',
        'The elevator shaft to Sector 2 is unlocked. Access the terminal to enter the Fab-Plex!',
      ],
      dialogueZh: [
        '你成功穿透了檢查哨的能量屏障！極其出色的潛入行動，特工。',
        '前往第二分區的電梯通道已解鎖。搭乘電梯即可深入製造廠複合體！',
      ],
      rewardClaimed: false,
    },
  ];
}

export function getSector2NPCs(): NPC[] {
  return [
    {
      id: 'npc-jackal',
      name: 'Jackal',
      role: '黑市軍火掮客',
      roleZh: '黑市軍火掮客',
      avatarColor: '#ff5252',
      x: 5,
      y: 17,
      hp: 90,
      maxHp: 90,
      isAlive: true,
      dialogue: [
        'Quiet, operative. This back alley is where Tzorg surplus changes hands.',
        'I have suppressors, dart rounds, and EMP cells. If you want to stay alive, stop leaving muzzle flashes.',
        'The Overmind core is east. Do not get sentimental. The future is bought with credits and bullets.',
      ],
      dialogueZh: [
        '小聲點，特工。這條暗巷是佐格軍需品私下流通的地方。',
        '我有消音器、飛鏢穿甲彈與電磁脈衝電池。想活命的話，開火時別弄出顯眼的槍口火光。',
        '中央主腦核心就在東側。別多愁善感了，未來是用信用點和子彈買回來的。',
      ],
      rewardClaimed: false,
    },
    {
      id: 'npc-zero-one',
      name: 'Zero-One',
      role: '叛逃覺醒生化人',
      roleZh: '叛逃覺醒生化人',
      avatarColor: '#b388ff',
      x: 4,
      y: 21,
      hp: 100,
      maxHp: 100,
      isAlive: true,
      dialogue: [
        'I was Unit 01 in the Tzorg fabrication line. Now I am the glitch they cannot patch.',
        'The server room below is humming with stolen human memories. The Overmind uses them as fuel.',
        'When you reach the core, choose carefully. Liberation is not just a command; it is a consequence.',
      ],
      dialogueZh: [
        '我曾是佐格生產線上的 01 號原型機。如今我是他們永遠無法修補的代碼漏洞。',
        '下方的機房伺服器正低鳴著被掠奪的人類記憶。中央主腦把這些靈魂當作運算燃料。',
        '當你抵達核心終端時，請審慎選擇。解放不僅僅是一道指令，更是承擔未來的抉擇。',
      ],
      rewardClaimed: false,
    },
  ];
}

export function getSectorStoryLogs(): StoryLog[] {
  return [
    {
      id: 'slate-vance',
      title: 'The Neural Collar Project: Remorse of a Bio-Engineer',
      titleZh: '神經項圈計畫：生化工程師的懺悔錄',
      author: 'Dr. Alexis Vance, Chief Geneticist',
      timestamp: '2400.08.12 // SUB-LAB 04',
      read: false,
      content: [
        'When the Tzorg Syndicate commissioned the neural collars, they claimed it was to cure psychological psychosis in deep space miners. God forgive us. It was never a cure.',
        'The high-frequency neural dampener overrides the limbic system, rendering human subjects perfectly compliant to synthetic overseers. I watched my colleagues willingly line up to be chipped.',
        'I managed to smuggle out the surgical override codes before fleeing to Sector 1. If Operative Raven can breach the central data hub, we might just be able to broadcast the purge signal and free Metropolis.'
      ],
      contentZh: [
        '當佐格集團委託開發神經項圈時，聲稱是為了治療深空礦工的心理疾病。願上帝寬恕我們，那從來不是治療。',
        '高頻神經抑制器直接覆寫邊緣系統，讓人類受試者對合成人管理者絕對服從。我親眼看著同事們自願排隊接受晶片植入。',
        '在逃往第一分區前，我設法走私出外科覆寫代碼。若雷文特工能突破中央數據樞紐，或許我們能廣播淨化信號，解放大都會。'
      ],
    },
    {
      id: 'slate-kira',
      title: 'Operation Prometheus: The Fall of Sector 2',
      titleZh: '普羅米修斯行動：第二分區陷落記錄',
      author: 'Commander Kira, Spark Resistance Cell',
      timestamp: '2400.10.04 // RESISTANCE CODEX',
      read: false,
      content: [
        'Sector 2 has fallen. The Hunter-Killer swarms descended at midnight, incinerating the underground greenhouse and our relay beacons.',
        'Only a handful of us made it through the sewage conduits into Sector 1. Tzorg responded by locking down Checkpoint 01 with an impenetrable high-yield plasma forcefield.',
        'Raven was critically wounded during the rearguard action. Doc Vance rebuilt your neural framework with salvaged military cyberware. You are the only operative left with Tzorg root credentials.'
      ],
      contentZh: [
        '第二分區已經陷落。獵殺者蜂群在午夜降臨，焚毀了地下溫室與我們的通訊中繼站。',
        '只有少數幾人通過污水管道逃進第一分區。佐格的應對是啟動 01 號檢查哨的高能電漿屏障，封鎖了一切通路。',
        '雷文在後衛戰中重傷。凡斯博士用搜刮來的軍用義體重建了你的神經架構。你是唯一還持有佐格根權限的特工。'
      ],
    },
    {
      id: 'slate-tzorg',
      title: "Tzorg Syndicate Security Directive: Subject 'Raven'",
      titleZh: '佐格安保最高密令：目標代號「雷文」',
      author: 'Tzorg AI Overmind Subroutine 9',
      timestamp: '2400.11.19 // CLASSIFIED SECURITY MEMO',
      read: false,
      content: [
        "PRIORITY ALERT TO ALL ENFORCER UNITS: Rogue cybernetic operative designated 'Raven' is active within Sector 1 perimeter.",
        'WARNING: Subject possesses prototype subdermal optical camouflage and advanced military EMP discharge capacitor. Lethal force authorized without restriction.',
        'UNDER NO CIRCUMSTANCES allow Subject Raven access to Checkpoint Terminal CHECKPOINT_FF. The master AI firewall architecture cannot withstand a physical neural handshake.'
      ],
      contentZh: [
        '給所有執法部隊的最高警戒：代號「雷文」的叛變生化特工已在第一分區警戒線內活動。',
        '警告：目標搭載原型皮下全像光學迷彩與軍規高壓電磁脈衝釋放器。授權無限制格殺勿論。',
        '在任何情況下嚴禁讓目標接近檢查哨終端機 CHECKPOINT_FF。中央防火牆無法抵禦物理神經握手入侵。'
      ],
    },
    {
      id: 'slate-ghost',
      title: 'Intercepted Transmission: The Spark of Liberation',
      titleZh: '攔截量子通訊：五百萬人的覺醒火花',
      author: 'Netrunner Ghost, Sector Relay Nexus',
      timestamp: '2400.11.23 // QUANTUM INTERCEPT',
      read: false,
      content: [
        "The citizens under the domes haven't seen natural sunlight in three generations. They sleep, they manufacture combat chassis, and they obey.",
        'Our informants confirm the master override cipher is housed inside the Vault terminal behind the Checkpoint. Once the forcefield drops, plug your cyberdeck into the core.',
        'When the broadcast towers light up with the liberation protocol, five million minds will wake up at once. Make every round count, Raven. The future of humanity begins here.'
      ],
      contentZh: [
        '巨蛋穹頂下的公民已經三代未見自然陽光。他們沉睡、製造戰鬥底盤，並且盲目服從。',
        '線人證實主覆寫密碼存放在檢查哨後方的核心終端內。一旦能量屏障瓦解，立刻接入你的生化網絡。',
        '當全城廣播塔亮起解放協定時，五百萬沉睡的神智將同時甦醒。珍惜每一發彈藥，雷文，人類的未來在此啟程。'
      ],
    },
  ];
}
