/* ============================================================
   SpriteTracker — sprite catalog
   Edit this file to add, rename or remove sprites/variations.
   Statuses already saved for a sprite id are kept when you edit it.
   ============================================================ */

window.SPRITE_CATALOG = {

  /* Bump this after adding sprites or variations below. Everyone who
     already has a saved list gets the new entries merged in on their
     next visit, keeping the statuses they already set. */
  catalogVersion: 5,

  /* The variations a sprite has unless it says otherwise. A sprite can
     override this with its own `variations: [...]` list — see Burnt
     Peanut and others below, most of which don't come in every form.
     Order here is the order they appear on every card. */
  variations: [
    'Base',
    'Gold',
    'Gummy',
    'Galaxy',
    'Holofoil',
    'Cube',
    'Gem',
    'Quack'
  ],

  baseSprites: [
    { id: 'air',           name: 'Air Sprite',        ability: 'Increases sprinting speed and jump height. Also nullifies fall damage.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Holofoil'] },
    { id: 'aura',          name: 'Aura Sprite',       ability: 'Grants a Shock Rock charge when dealing enough damage.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Gem'] },
    { id: 'batman',        name: 'Batman Sprite',     ability: 'Launches you upwards to deploy the Bat Cape.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Holofoil', 'Cube'] },
    { id: 'boss',          name: 'Boss Sprite',       ability: 'Boosts maximum Health and Shield.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Cube'] },
    { id: 'burnt_peanut',  name: 'Burnt Peanut',      ability: 'Small chance to drop additional loot from eliminations, sometimes Mythic.',
      variations: ['Base'] },
    { id: 'demon',         name: 'Demon Sprite',      ability: 'Grants Siphon on eliminations.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Gem'] },
    { id: 'dream',         name: 'Dream Sprite',      ability: 'Gives a random item per level up; explodes with Legendary loot at max level.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Cube'] },
    { id: 'duck',          name: 'Duck Sprite',       ability: 'Replenishes Shield when Emoting or Jamming.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Gem'] },
    { id: 'earth',         name: 'Earth Sprite',      ability: 'Increases chances of rare items from chests.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Gem', 'Cube', 'Quack'] },
    { id: 'fire',          name: 'Fire Sprite',       ability: 'Creates a fiery burst of damage when dealing enough damage.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Holofoil', 'Cube', 'Quack'] },
    { id: 'fishy',         name: 'Fishy Sprite',      ability: 'Swim faster and brief speed boost when taking damage.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Cube'] },
    { id: 'ghost',         name: 'Ghost Sprite',      ability: 'Grants Cloaking when reloading.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Holofoil'] },
    { id: 'grim',          name: 'Grim Sprite',       ability: 'Scans and reveals opponents who attack you.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Holofoil', 'Cube', 'Gem'] },
    { id: 'ironmouse',     name: 'Ironmouse Sprite',  ability: 'Regenerates Health when low; grants Cloak and Low Gravity while regenerating.',
      variations: ['Base'] },
    { id: 'john_wick',     name: 'John Wick Sprite',  ability: 'Knocking a player reveals other opponents nearby.',
      variations: ['Base'] },
    { id: 'king',          name: 'King Sprite',       ability: 'Increases Pickaxe damage.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Holofoil'] },
    { id: 'llama',         name: 'Llama Sprite',      ability: 'Opening ammo boxes has a chance to grant a weapon upgrade.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Gem'] },
    { id: 'peely',         name: 'Peely Sprite',      ability: 'Pings nearby players carrying rare Sprites, but marks you on the map in return.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Holofoil'] },
    { id: 'pollo',         name: 'Pollo Sprite',      ability: 'Replenishes Shield for squad after eliminations.',
      variations: ['Base'] },
    { id: 'punk',          name: 'Punk Sprite',       ability: 'Grants unlimited ammo buff at Level 5.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Cube'] },
    { id: 'seven',         name: 'Seven Sprite',      ability: 'Reveals enemy foot trails to squadmates.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Holofoil'] },
    { id: 'striker',       name: 'Striker Sprite',    ability: 'Grants Overdrive when mantling or hurdling.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Holofoil'] },
    { id: 'vini_jr',       name: 'Vini Jr. Sprite',   ability: 'Increases structural damage after sprinting; Overdrive after sliding.',
      variations: ['Base'] },
    { id: 'water',         name: 'Water Sprite',      ability: 'Replenishes Shield while standing in water.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Holofoil', 'Gem', 'Quack'] },
    { id: 'zero_point',    name: 'Zero Point Sprite', ability: 'Spawns a Shield Bubble Jr. when using a healing item.',
      variations: ['Base', 'Gold', 'Gummy', 'Galaxy', 'Holofoil', 'Cube', 'Quack', 'Gem'] }
  ]
};
