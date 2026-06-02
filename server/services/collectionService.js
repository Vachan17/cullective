const Collection = require('../models/Collection');
const Photo = require('../models/Photo');

const SYSTEM_COLLECTIONS = [
  { name:'Best Picks',       category:'best_picks',        icon:'⭐', color:'#F59E0B', filter: p => (p.aiScore||0) >= 80 },
  { name:'Duplicates',       category:'duplicates',        icon:'👯', color:'#F97316', filter: (p, ctx) => p.duplicateGroupId && ctx?.groupCounts?.[p.duplicateGroupId] > 1 },
  { name:'Blurry Photos',    category:'blurry',             icon:'💧', color:'#6B7280', filter: p => p.analysis?.isBlurry },
  { name:'Closed Eyes',      category:'closed_eyes',        icon:'😑', color:'#EF4444', filter: p => p.analysis?.eyesOpen === false },
  { name:'Group Photos',     category:'group_photos',       icon:'👥', color:'#8B5CF6', filter: p => p.analysis?.isGroupPhoto },
  { name:'Portraits',        category:'portraits',          icon:'🧑', color:'#3B82F6', filter: p => p.analysis?.isPortrait },
  { name:'Couple Photos',    category:'couple_photos',      icon:'💑', color:'#EC4899', filter: p => p.analysis?.isCouplePhoto },
  { name:'Black & White',    category:'black_white',        icon:'◑',  color:'#9CA3AF', filter: p => p.analysis?.isBlackAndWhite },
  { name:'Color Graded',     category:'color_graded',       icon:'🎨', color:'#F97316', filter: p => p.analysis?.isColorGraded },
  { name:'Wedding Shots',    category:'wedding',            icon:'💍', color:'#F9A8D4', filter: p => p.analysis?.isWedding },
  { name:'Night Shots',      category:'night',              icon:'🌙', color:'#6366F1', filter: p => p.analysis?.isNight },
  { name:'Instagram Worthy', category:'instagram_worthy',   icon:'📸', color:'#EC4899', filter: p => (p.aiScore||0) >= 90 && !p.analysis?.isBlurry },
  { name:'Album Ready',      category:'album_ready',        icon:'📔', color:'#10B981', filter: p => (p.aiScore||0) >= 85 && !p.analysis?.isBlurry },
  { name:'Noisy Photos',     category:'noisy',              icon:'🌫️', color:'#78716C', filter: p => p.analysis?.noise?.isNoisy },
  { name:'Rejected Photos',  category:'rejected',           icon:'🗑️', color:'#EF4444', filter: p => p.status === 'rejected' },
];

const buildSystemCollections = async (projectId, userId) => {
  const photos = await Photo.find({ projectId, status: { $ne: 'deleted' } }).lean();
  
  // Calculate counts for duplicate groups to group originals and duplicates together
  const groupCounts = {};
  for (const p of photos) {
    if (p.duplicateGroupId) {
      groupCounts[p.duplicateGroupId] = (groupCounts[p.duplicateGroupId] || 0) + 1;
    }
  }
  const ctx = { groupCounts };

  const results = [];
  for (const def of SYSTEM_COLLECTIONS) {
    const matching = photos.filter(p => {
      if (p.status === 'rejected' && def.category !== 'rejected') return false;
      return def.filter(p, ctx);
    }).map(p => p._id);
    let col = await Collection.findOne({ projectId, category: def.category });
    if (!col) col = new Collection({ projectId, userId, name: def.name, category: def.category, icon: def.icon, color: def.color, type: 'auto', isSystem: true });
    col.photos = matching;
    col.photoCount = matching.length;
    if (matching.length) {
      const best = photos.filter(p => matching.map(String).includes(String(p._id))).sort((a,b)=>(b.aiScore||0)-(a.aiScore||0))[0];
      col.coverPhoto = best?.thumbnailUrl || null;
    }
    await col.save();
    results.push(col);
  }
  return results;
};

module.exports = { buildSystemCollections, SYSTEM_COLLECTIONS };
