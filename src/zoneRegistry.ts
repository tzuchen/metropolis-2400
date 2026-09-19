import { ZoneLocationInfo } from './types';

export interface ZoneDefinition extends ZoneLocationInfo {
  sectorId: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  priority: number;
}

const zoneRegistry: ZoneDefinition[] = [
  // Sector 1
  {
    sectorId: 'sector-1',
    zone_id: 'detention_cell',
    name_zh: '拘留室',
    name_en: 'Detention Cell',
    description: '拘留犯人的區域',
    description_zh: '拘留犯人的區域',
    is_restricted: true,
    minX: 33,
    maxX: 37,
    minY: 3,
    maxY: 7,
    priority: 10,
  },
  {
    sectorId: 'sector-1',
    zone_id: 'detention_guard_post',
    name_zh: '拘留哨站',
    name_en: 'Detention Guard Post',
    description: '看守拘留室的哨站',
    description_zh: '看守拘留室的哨站',
    is_restricted: true,
    minX: 31,
    maxX: 33,
    minY: 1,
    maxY: 8,
    priority: 10,
  },
  {
    sectorId: 'sector-1',
    zone_id: 'rebel_safehouse',
    name_zh: '叛軍安全屋',
    name_en: 'Rebel Safehouse',
    description: '叛軍的藏身之處',
    description_zh: '叛軍的藏身之處',
    is_restricted: false,
    minX: 2,
    maxX: 10,
    minY: 2,
    maxY: 8,
    priority: 5,
  },
  {
    sectorId: 'sector-1',
    zone_id: 'checkpoint_relay_annex',
    name_zh: '檢查站轉接附樓',
    name_en: 'Checkpoint Relay Annex',
    description: '檢查站的轉接設施',
    description_zh: '檢查站的轉接設施',
    is_restricted: true,
    minX: 28,
    maxX: 31,
    minY: 4,
    maxY: 9,
    priority: 10,
  },
  {
    sectorId: 'sector-1',
    zone_id: 'checkpoint_outpost',
    name_zh: '檢查站前哨',
    name_en: 'Checkpoint Outpost',
    description: '檢查站的前哨站',
    description_zh: '檢查站的前哨站',
    is_restricted: true,
    minX: 24,
    maxX: 28,
    minY: 4,
    maxY: 8,
    priority: 10,
  },
  {
    sectorId: 'sector-1',
    zone_id: 'cyber_park',
    name_zh: '賽博公園',
    name_en: 'Cyber Park',
    description: '充滿科技感的公園',
    description_zh: '充滿科技感的公園',
    is_restricted: false,
    minX: 18,
    maxX: 22,
    minY: 10,
    maxY: 14,
    priority: 5,
  },
  {
    sectorId: 'sector-1',
    zone_id: 'transit_elevator',
    name_zh: '交通電梯',
    name_en: 'Transit Elevator',
    description: '連接不同區域的電梯',
    description_zh: '連接不同區域的電梯',
    is_restricted: false,
    minX: 34,
    maxX: 38,
    minY: 23,
    maxY: 27,
    priority: 5,
  },
  {
    sectorId: 'sector-1',
    zone_id: 'downtown_main_street',
    name_zh: '市中心主街',
    name_en: 'Downtown Main Street',
    description: '市中心的主要街道',
    description_zh: '市中心的主要街道',
    is_restricted: false,
    minX: 11,
    maxX: 25,
    minY: 8,
    maxY: 13,
    priority: 5,
  },
  {
    sectorId: 'sector-1',
    zone_id: 'sector-1-default',
    name_zh: '第一扇區',
    name_en: 'Sector 1',
    description: '第一扇區的未定義區域',
    description_zh: '第一扇區的未定義區域',
    is_restricted: false,
    minX: -Infinity,
    maxX: Infinity,
    minY: -Infinity,
    maxY: Infinity,
    priority: 0,
  },

  // Sub-Sector 0
  {
    sectorId: 'sub-sector-0',
    zone_id: 'sludge_pump_station',
    name_zh: '污泥泵站',
    name_en: 'Sludge Pump Station',
    description: '處理污泥的泵站',
    description_zh: '處理污泥的泵站',
    is_restricted: false,
    minX: 10,
    maxX: 18,
    minY: 10,
    maxY: 18,
    priority: 10,
  },
  {
    sectorId: 'sub-sector-0',
    zone_id: 'sunken_freighter',
    name_zh: '沉沒貨船',
    name_en: 'Sunken Freighter',
    description: '沉沒在廢液中的貨船',
    description_zh: '沉沒在廢液中的貨船',
    is_restricted: false,
    minX: 25,
    maxX: 35,
    minY: 20,
    maxY: 26,
    priority: 8,
  },
  {
    sectorId: 'sub-sector-0',
    zone_id: 'drainage_maintenance_tunnel',
    name_zh: '排水維護隧道',
    name_en: 'Drainage Maintenance Tunnel',
    description: '用於維護排水系統的隧道',
    description_zh: '用於維護排水系統的隧道',
    is_restricted: false,
    minX: -Infinity,
    maxX: Infinity,
    minY: -Infinity,
    maxY: Infinity,
    priority: 0,
  },

  // Sector 2
  {
    sectorId: 'sector-2',
    zone_id: 'synchronizer_chamber',
    name_zh: '同步器室',
    name_en: 'Synchronizer Chamber',
    description: '同步器運作的房間',
    description_zh: '同步器運作的房間',
    is_restricted: false,
    minX: 20,
    maxX: 30,
    minY: 2,
    maxY: 8,
    priority: 10,
  },
  {
    sectorId: 'sector-2',
    zone_id: 'smuggler_black_market',
    name_zh: '走私者黑市',
    name_en: 'Smuggler Black Market',
    description: '走私者交易的黑市',
    description_zh: '走私者交易的黑市',
    is_restricted: false,
    minX: 4,
    maxX: 10,
    minY: 14,
    maxY: 20,
    priority: 8,
  },
  {
    sectorId: 'sector-2',
    zone_id: 'factory_assembly_floor',
    name_zh: '工廠組裝層',
    name_en: 'Factory Assembly Floor',
    description: '工廠的組裝區域',
    description_zh: '工廠的組裝區域',
    is_restricted: false,
    minX: -Infinity,
    maxX: Infinity,
    minY: -Infinity,
    maxY: Infinity,
    priority: 0,
  },

  // Citadel
  {
    sectorId: 'citadel',
    zone_id: 'citadel_gate',
    name_zh: '堡壘大門',
    name_en: 'Citadel Gate',
    description: '堡壘的入口',
    description_zh: '堡壘的入口',
    is_restricted: true,
    minX: 2,
    maxX: 12,
    minY: 10,
    maxY: 18,
    priority: 10,
  },
  {
    sectorId: 'citadel',
    zone_id: 'overmind_core',
    name_zh: '超智核心',
    name_en: 'Overmind Core',
    description: '超智的核心區域',
    description_zh: '超智的核心區域',
    is_restricted: true,
    minX: 30,
    maxX: 38,
    minY: 10,
    maxY: 20,
    priority: 10,
  },
  {
    sectorId: 'citadel',
    zone_id: 'citadel_corridor',
    name_zh: '堡壘走廊',
    name_en: 'Citadel Corridor',
    description: '堡壘內的走廊',
    description_zh: '堡壘內的走廊',
    is_restricted: false,
    minX: -Infinity,
    maxX: Infinity,
    minY: -Infinity,
    maxY: Infinity,
    priority: 0,
  },
];

export function resolveZoneLocation(sectorId: string, x: number, y: number): ZoneLocationInfo {
  const sectorZones = zoneRegistry.filter(
    (zone) =>
      zone.sectorId === sectorId &&
      x >= zone.minX &&
      x <= zone.maxX &&
      y >= zone.minY &&
      y <= zone.maxY
  );

  if (sectorZones.length === 0) {
    return {
      zone_id: 'unknown',
      name_zh: '未知區域',
      name_en: 'Unknown Zone',
      description: '未知區域',
      description_zh: '未知區域',
      is_restricted: false,
    };
  }

  const highestPriorityZone = sectorZones.reduce((prev, current) =>
    current.priority > prev.priority ? current : prev
  );

  return {
    zone_id: highestPriorityZone.zone_id,
    name_zh: highestPriorityZone.name_zh,
    name_en: highestPriorityZone.name_en,
    description: highestPriorityZone.description,
    description_zh: highestPriorityZone.description_zh,
    is_restricted: highestPriorityZone.is_restricted,
  };
}
