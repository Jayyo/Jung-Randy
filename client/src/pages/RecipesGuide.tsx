import { useState, useMemo } from 'react';
import { Users, ArrowRight, Info } from 'lucide-react';
import {
  ALL_POLITICIANS,
  ALL_RECIPES,
  getPoliticianById,
  TIER_COLORS,
  TIER_NAMES,
  PoliticianTier,
} from '@/game/data/politicians';

type TabId = 'lv1' | 'lv2' | 'lv3' | 'lv4' | 'lv5' | 'lv6' | 'x' | 'z';

interface TabConfig {
  id: TabId;
  label: string;
  icon: string;
  color: string;
}

const TABS: TabConfig[] = [
  { id: 'lv1', label: '기초→일반', icon: '🔹', color: TIER_COLORS.lv2 },
  { id: 'lv2', label: '일반→중진', icon: '🔷', color: TIER_COLORS.lv3 },
  { id: 'lv3', label: '중진→거물', icon: '🔮', color: TIER_COLORS.lv4 },
  { id: 'lv4', label: '거물→대통령', icon: '⭐', color: TIER_COLORS.lv5 },
  { id: 'lv5', label: '대통령→현직', icon: '🔥', color: TIER_COLORS.lv6 },
  { id: 'x', label: 'X티어', icon: '💫', color: TIER_COLORS.x },
  { id: 'z', label: 'Z티어', icon: '✨', color: TIER_COLORS.z },
];

const RecipesGuide = () => {
  const [activeTab, setActiveTab] = useState<TabId>('lv2');

  // Get recipes by result tier
  const recipesByResultTier = useMemo(() => {
    const result: Record<string, typeof ALL_RECIPES> = {
      lv2: [],
      lv3: [],
      lv4: [],
      lv5: [],
      lv6: [],
      x: [],
      z: [],
    };

    for (const recipe of ALL_RECIPES) {
      if (recipe.result === 'random_lv2') {
        result.lv2.push(recipe);
        continue;
      }
      const politician = getPoliticianById(recipe.result);
      if (politician) {
        result[politician.tier]?.push(recipe);
      }
    }

    return result;
  }, []);

  // Get politicians by tier
  const politiciansByTier = useMemo(() => {
    const result: Record<PoliticianTier, typeof ALL_POLITICIANS> = {
      lv1: [],
      lv2: [],
      lv3: [],
      lv4: [],
      lv5: [],
      lv6: [],
      x: [],
      z: [],
    };

    for (const p of ALL_POLITICIANS) {
      result[p.tier].push(p);
    }

    return result;
  }, []);

  // Get Lv2 total count for random recipe display
  const lv2Total = politiciansByTier.lv2.length;

  // Material card component
  const MaterialCard = ({ id }: { id: string }) => {
    const politician = getPoliticianById(id);
    if (!politician) {
      // Handle L1_DM / L1_KH
      if (id === 'L1_DM') {
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded border border-blue-400 bg-blue-900/30 text-blue-200">
            <Users size={12} />
            <span className="text-xs font-bold">민주 지지층</span>
          </div>
        );
      }
      if (id === 'L1_KH') {
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded border border-red-400 bg-red-900/30 text-red-200">
            <Users size={12} />
            <span className="text-xs font-bold">국힘 지지층</span>
          </div>
        );
      }
      return <span className="text-xs text-slate-500">{id}</span>;
    }

    const tierColor = TIER_COLORS[politician.tier];
    return (
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-md border"
        style={{ borderColor: tierColor, backgroundColor: `${tierColor}20` }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: tierColor }}
        />
        <span className="text-xs text-gray-200 font-medium">{politician.name}</span>
        <span className="text-[9px] text-slate-400">({TIER_NAMES[politician.tier]})</span>
      </div>
    );
  };

  // Recipe card component
  const RecipeCard = ({ recipeId }: { recipeId: string }) => {
    const recipe = ALL_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return null;

    const resultPolitician = getPoliticianById(recipe.result);
    if (!resultPolitician) return null;

    const tierColor = TIER_COLORS[resultPolitician.tier];

    return (
      <div
        className="bg-slate-900/50 border border-slate-700 p-3 rounded-lg flex flex-col gap-2 hover:border-opacity-100 transition-colors group"
        style={{ '--hover-color': tierColor } as React.CSSProperties}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span
              className="text-lg font-bold text-white group-hover:opacity-90"
              style={{ color: tierColor }}
            >
              {resultPolitician.name}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white"
              style={{ backgroundColor: tierColor }}
            >
              {TIER_NAMES[resultPolitician.tier]}
            </span>
          </div>
        </div>
        <div className="h-px bg-slate-700/50 w-full"></div>
        <div className="flex items-center flex-wrap gap-1.5 text-sm">
          {recipe.materials.map((mat, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <MaterialCard id={mat} />
              {idx < recipe.materials.length - 1 && (
                <span className="text-slate-500 text-xs">+</span>
              )}
            </div>
          ))}
        </div>
        {resultPolitician.hasSkill && resultPolitician.skillName && (
          <div className="text-[10px] text-slate-400 mt-1">
            🎯 {resultPolitician.skillName}: {resultPolitician.skillDescription}
          </div>
        )}
      </div>
    );
  };

  // Unit list component
  const UnitList = ({ tier, title }: { tier: PoliticianTier; title: string }) => {
    const politicians = politiciansByTier[tier];
    const tierColor = TIER_COLORS[tier];

    return (
      <div className="space-y-4">
        <h3
          className="font-bold border-b pb-2 flex items-center gap-2"
          style={{ color: tierColor, borderColor: `${tierColor}40` }}
        >
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: tierColor }}
          />
          {title} ({politicians.length}명)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {politicians.map((p, idx) => (
            <div
              key={idx}
              className="bg-slate-800 p-2 rounded flex justify-between items-center text-sm hover:bg-slate-700 transition-colors"
            >
              <span className="text-gray-200">{p.name}</span>
              {p.hasSkill && <span className="text-yellow-400 text-[10px]">🎯</span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900 text-gray-100 p-4 font-sans overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 text-transparent bg-clip-text">
            정랜디 조합 가이드 v2
          </h1>
          <p className="text-slate-400 text-sm">
            총 {ALL_POLITICIANS.length}명 정치인 · {ALL_RECIPES.length}개 조합법
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full font-bold transition-all flex items-center gap-2 text-sm ${
                activeTab === tab.id
                ? 'text-white shadow-lg scale-105'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
              style={activeTab === tab.id ? { backgroundColor: tab.color } : {}}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 min-h-[500px]">

          {/* Lv1 -> Lv2 (Random) */}
          {activeTab === 'lv1' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span>🔹</span>
                {TIER_NAMES.lv1} → {TIER_NAMES.lv2}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { a: '국힘', b: '국힘', colorA: 'red', colorB: 'red' },
                  { a: '민주', b: '민주', colorA: 'blue', colorB: 'blue' },
                  { a: '국힘', b: '민주', colorA: 'red', colorB: 'blue' },
                ].map((combo, idx) => (
                  <div key={idx} className="bg-slate-900 p-6 rounded-xl border border-slate-700 flex flex-col items-center gap-4">
                    <div className="flex gap-2">
                      <div className={`w-16 h-20 bg-${combo.colorA}-900/50 border border-${combo.colorA}-500 rounded flex flex-col items-center justify-center`}>
                        <Users size={20} className={`text-${combo.colorA}-400 mb-1`} />
                        <span className={`text-xs text-${combo.colorA}-200`}>{combo.a}</span>
                        <span className="text-[10px] text-slate-400">Lv1</span>
                      </div>
                      <div className="flex items-center text-slate-500">+</div>
                      <div className={`w-16 h-20 bg-${combo.colorB}-900/50 border border-${combo.colorB}-500 rounded flex flex-col items-center justify-center`}>
                        <Users size={20} className={`text-${combo.colorB}-400 mb-1`} />
                        <span className={`text-xs text-${combo.colorB}-200`}>{combo.b}</span>
                        <span className="text-[10px] text-slate-400">Lv1</span>
                      </div>
                    </div>
                    <ArrowRight className="text-slate-500" />
                    <div className="w-full bg-slate-800 border border-slate-600 p-3 rounded text-center">
                      <p className="font-bold text-gray-200">랜덤 Lv2 의원</p>
                      <p className="text-xs text-slate-500 mt-1">({lv2Total}종 중 1명)</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-900/30 p-4 rounded border border-indigo-500/30 text-center text-indigo-200 text-sm">
                <Info size={16} className="inline mr-2 mb-1" />
                Lv1 2장 조합 시 <strong>전체 Lv2 풀({lv2Total}명) 중 랜덤 1명</strong> 획득
              </div>

              <UnitList tier="lv2" title="Lv2 일반 의원 목록" />
            </div>
          )}

          {/* Lv2 -> Lv3 */}
          {activeTab === 'lv2' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: TIER_COLORS.lv3 }}>
                <span>🔷</span>
                {TIER_NAMES.lv2} → {TIER_NAMES.lv3} ({recipesByResultTier.lv3.length}종)
              </h2>
              <p className="text-sm text-slate-400">Lv2 2명 + Lv1 1명 = Lv3 핵심 중진</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {recipesByResultTier.lv3.map(recipe => (
                  <RecipeCard key={recipe.id} recipeId={recipe.id} />
                ))}
              </div>
            </div>
          )}

          {/* Lv3 -> Lv4 */}
          {activeTab === 'lv3' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: TIER_COLORS.lv4 }}>
                <span>🔮</span>
                {TIER_NAMES.lv3} → {TIER_NAMES.lv4} ({recipesByResultTier.lv4.length}종)
              </h2>
              <p className="text-sm text-slate-400">Lv3 2명 + Lv2 1명 = Lv4 원외 거물</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {recipesByResultTier.lv4.map(recipe => (
                  <RecipeCard key={recipe.id} recipeId={recipe.id} />
                ))}
              </div>
            </div>
          )}

          {/* Lv4 -> Lv5 */}
          {activeTab === 'lv4' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: TIER_COLORS.lv5 }}>
                <span>⭐</span>
                {TIER_NAMES.lv4} → {TIER_NAMES.lv5} ({recipesByResultTier.lv5.length}종)
              </h2>
              <p className="text-sm text-slate-400">Lv4 2명 + Lv3 1명 = Lv5 대통령</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {recipesByResultTier.lv5.map(recipe => (
                  <RecipeCard key={recipe.id} recipeId={recipe.id} />
                ))}
              </div>
            </div>
          )}

          {/* Lv5 -> Lv6 */}
          {activeTab === 'lv5' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: TIER_COLORS.lv6 }}>
                <span>🔥</span>
                {TIER_NAMES.lv5} → {TIER_NAMES.lv6} ({recipesByResultTier.lv6.length}종)
              </h2>
              <p className="text-sm text-slate-400">Lv5 진보 + Lv5 보수 + Z조국 = Lv6 현직 대통령</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {recipesByResultTier.lv6.map(recipe => (
                  <RecipeCard key={recipe.id} recipeId={recipe.id} />
                ))}
              </div>
              {recipesByResultTier.lv6.length === 0 && (
                <div className="text-center text-slate-500 py-8">
                  Lv6 조합법이 없습니다.
                </div>
              )}
            </div>
          )}

          {/* X-tier */}
          {activeTab === 'x' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: TIER_COLORS.x }}>
                <span>💫</span>
                {TIER_NAMES.x} ({recipesByResultTier.x.length}종)
              </h2>
              <p className="text-sm text-slate-400">대선 후보 폼 - 특수 조합</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {recipesByResultTier.x.map(recipe => (
                  <RecipeCard key={recipe.id} recipeId={recipe.id} />
                ))}
              </div>
              <UnitList tier="x" title="X티어 유닛 목록" />
            </div>
          )}

          {/* Z-tier */}
          {activeTab === 'z' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: TIER_COLORS.z }}>
                <span>✨</span>
                {TIER_NAMES.z} ({recipesByResultTier.z.length}종)
              </h2>
              <p className="text-sm text-slate-400">상징/폼 티어 - 역사적 인물 및 특수 폼</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {recipesByResultTier.z.map(recipe => (
                  <RecipeCard key={recipe.id} recipeId={recipe.id} />
                ))}
              </div>
              <UnitList tier="z" title="Z티어 유닛 목록" />
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="text-center text-slate-500 text-xs space-y-1">
          <p>정랜디 조합 가이드 v2.0</p>
          <p>데이터 출처: politicians.json · recipes.json</p>
        </div>
      </div>
    </div>
  );
};

export default RecipesGuide;
