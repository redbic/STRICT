// Centralized tileset definitions
// Used by tile-picker, environment-builder, and game rendering

const TILESETS = {
  // ===================
  // Room Builder tilesets
  // ===================
  floors: { path: '/assets/tiles/Room_Builder_Floors_16x16.png', name: 'RB - Floors' },
  walls: { path: '/assets/tiles/Room_Builder_Walls_16x16.png', name: 'RB - Walls' },
  walls3d: { path: '/assets/tiles/Room_Builder_3d_walls_16x16.png', name: 'RB - 3D Walls' },
  arches: { path: '/assets/tiles/Room_Builder_Arched_Entryways_16x16.png', name: 'RB - Arches' },
  baseboards: { path: '/assets/tiles/Room_Builder_Baseboards_16x16.png', name: 'RB - Baseboards' },
  columns: { path: '/assets/tiles/Room_Builder_Columns_16x16.png', name: 'RB - Columns' },
  freestanding: { path: '/assets/tiles/Room_Builder_free_standing_16x16.png', name: 'RB - Freestanding' },
  rugs: { path: '/assets/tiles/Room_Builder_Rugs_16x16.png', name: 'RB - Rugs' },

  // ===================
  // Theme tilesets (1-26)
  // ===================
  t01_generic: { path: '/assets/tiles/1_Generic_16x16.png', name: '01 - Generic' },
  t02_livingRoom: { path: '/assets/tiles/2_LivingRoom_16x16.png', name: '02 - Living Room' },
  t03_bathroom: { path: '/assets/tiles/3_Bathroom_16x16.png', name: '03 - Bathroom' },
  t04_bedroom: { path: '/assets/tiles/4_Bedroom_16x16.png', name: '04 - Bedroom' },
  t05_classroom: { path: '/assets/tiles/5_Classroom_and_library_16x16.png', name: '05 - Classroom & Library' },
  t06_music: { path: '/assets/tiles/6_Music_and_sport_16x16.png', name: '06 - Music & Sport' },
  t07_art: { path: '/assets/tiles/7_Art_16x16.png', name: '07 - Art' },
  t08_hospital: { path: '/assets/tiles/8_Hospital_16x16.png', name: '08 - Hospital' },
  t09_school: { path: '/assets/tiles/9_School_16x16.png', name: '09 - School' },
  t10_laundryCleaning: { path: '/assets/tiles/10_Laundry_and_Cleaning_16x16.png', name: '10 - Laundry & Cleaning' },
  t11_kitchen: { path: '/assets/tiles/11_Kitchen_16x16.png', name: '11 - Kitchen' },
  t12_diningRoom: { path: '/assets/tiles/12_Dining_Room_16x16.png', name: '12 - Dining Room' },
  t13_lobby: { path: '/assets/tiles/13_Lobby_16x16.png', name: '13 - Lobby' },
  t14_basement: { path: '/assets/tiles/14_Basement_16x16.png', name: '14 - Basement' },
  t15_plants: { path: '/assets/tiles/15_Christmas_16x16.png', name: '15 - Christmas' },
  t16_halloween: { path: '/assets/tiles/16_Halloween_16x16.png', name: '16 - Halloween' },
  t17_supermarket: { path: '/assets/tiles/17_Visibile_Inventory_16x16.png', name: '17 - Visible Inventory' },
  t18_fastFood: { path: '/assets/tiles/18_Jail_16x16.png', name: '18 - Jail' },
  t19_gym: { path: '/assets/tiles/19_Hospital_Expansion_16x16.png', name: '19 - Hospital Expansion' },
  t20_office: { path: '/assets/tiles/20_Japanese_interiors_16x16.png', name: '20 - Japanese Interiors' },
  t21_conference: { path: '/assets/tiles/21_Vampires_16x16.png', name: '21 - Vampires' },
  t22_garden: { path: '/assets/tiles/22_Museum_16x16.png', name: '22 - Museum' },
  t23_pool: { path: '/assets/tiles/23_Haunted_House_16x16.png', name: '23 - Haunted House' },
  t24_parking: { path: '/assets/tiles/24_Ice_Cream_Shop_16x16.png', name: '24 - Ice Cream Shop' },
  t25_warehouse: { path: '/assets/tiles/25_Pirate_16x16.png', name: '25 - Pirate' },
  t26_factory: { path: '/assets/tiles/26_Convinience_Store_16x16.png', name: '26 - Convenience Store' },
};

// Tile size constant
const TILE_SIZE = 16;

// Make TILESETS available globally for non-module scripts
if (typeof window !== 'undefined') {
  window.TILESETS = TILESETS;
  window.TILE_SIZE = TILE_SIZE;
}
