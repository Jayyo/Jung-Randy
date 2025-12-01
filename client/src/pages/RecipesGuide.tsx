import React, { useState } from 'react';
import { Users, Shuffle, ArrowRight, Shield, Crown, Info } from 'lucide-react';

const DM_COLOR = "bg-blue-600";
const KH_COLOR = "bg-red-600";
const MINOR_COLOR = "bg-gray-600";
const REFORM_COLOR = "bg-orange-500";
const JINBO_COLOR = "bg-red-800"; // 진보당
const KOREA_COLOR = "bg-blue-800"; // 조국혁신당

type Party = 'DM' | 'KH' | 'MINOR' | 'REFORM' | 'JINBO' | 'KOREA' | 'BASIC' | 'INDEP';

interface Unit {
  name: string;
  party: Party;
  role?: string;
  desc?: string;
}

interface Recipe {
  target: Unit;
  materials: string[]; // Names of Lv2
  base: 'L1_DM' | 'L1_KH';
}

const RecipesGuide = () => {
  const [activeTab, setActiveTab] = useState<'lv1' | 'lv2' | 'lv3'>('lv3');

  // --- Data Definitions ---
  const lv2_dm: Unit[] = [
    { name: "권칠승", party: 'DM', role: "행안위" }, { name: "김교흥", party: 'DM', role: "문체위" },
    { name: "김병기", party: 'DM', role: "정보/국방" }, { name: "김성환", party: 'DM', role: "산자위" },
    { name: "김영진", party: 'DM', role: "기재/정보" }, { name: "김영호", party: 'DM', role: "교육위" },
    { name: "김윤덕", party: 'DM', role: "문체위" }, { name: "김정호", party: 'DM', role: "기후/농해수" },
    { name: "맹성규", party: 'DM', role: "국토위" }, { name: "박정", party: 'DM', role: "환경노동" },
    { name: "박주민", party: 'DM', role: "복지위" }, { name: "박찬대", party: 'DM', role: "정무위" },
    { name: "백혜련", party: 'DM', role: "복지위" }, { name: "서삼석", party: 'DM', role: "농해수" },
  ];

  const lv2_kh: Unit[] = [
    { name: "김석기", party: 'KH', role: "외통위" }, { name: "김성원", party: 'KH', role: "산자위" },
    { name: "김정재", party: 'KH', role: "국토위" }, { name: "김희정", party: 'KH', role: "국토위" },
    { name: "성일종", party: 'KH', role: "국방위" }, { name: "송석준", party: 'KH', role: "법사위" },
    { name: "송언석", party: 'KH', role: "정무/운영" }, { name: "신성범", party: 'KH', role: "과방/정보" },
    { name: "윤한홍", party: 'KH', role: "정무위" }, { name: "이만희", party: 'KH', role: "농해수" },
    { name: "이양수", party: 'KH', role: "정무위" }, { name: "이철규", party: 'KH', role: "산자위" },
    { name: "임이자", party: 'KH', role: "기재위" },
  ];

  const lv3_recipes_dm: Recipe[] = [
    { target: { name: "김태년", party: 'DM', desc: "5선" }, materials: ["김영호", "박정"], base: "L1_DM" },
    { target: { name: "박지원", party: 'DM', desc: "5선" }, materials: ["권칠승", "박찬대"], base: "L1_DM" },
    { target: { name: "박홍근", party: 'DM', desc: "4선" }, materials: ["김성환", "박주민"], base: "L1_DM" },
    { target: { name: "서영교", party: 'DM', desc: "4선" }, materials: ["권칠승", "김병기"], base: "L1_DM" },
    { target: { name: "안규백", party: 'DM', desc: "5선" }, materials: ["김정호", "박찬대"], base: "L1_DM" },
    { target: { name: "윤호중", party: 'DM', desc: "5선" }, materials: ["김윤덕", "박주민"], base: "L1_DM" },
    { target: { name: "이인영", party: 'DM', desc: "5선" }, materials: ["김교흥", "김영진"], base: "L1_DM" },
    { target: { name: "정동영", party: 'DM', desc: "5선" }, materials: ["김병기", "김영진"], base: "L1_DM" },
    { target: { name: "정성호", party: 'DM', desc: "5선" }, materials: ["김성환", "맹성규"], base: "L1_DM" },
    { target: { name: "정청래", party: 'DM', desc: "4선" }, materials: ["김병기", "박주민"], base: "L1_DM" },
    { target: { name: "조정식", party: 'DM', desc: "6선" }, materials: ["김성환", "서삼석"], base: "L1_DM" },
    { target: { name: "추미애", party: 'DM', desc: "6선" }, materials: ["김영진", "김윤덕"], base: "L1_DM" },
  ];

  const lv3_recipes_kh: Recipe[] = [
    { target: { name: "권성동", party: 'KH', desc: "5선" }, materials: ["김성원", "송석준"], base: "L1_KH" },
    { target: { name: "권영세", party: 'KH', desc: "5선" }, materials: ["김희정", "임이자"], base: "L1_KH" },
    { target: { name: "김기현", party: 'KH', desc: "5선" }, materials: ["김석기", "김정재"], base: "L1_KH" },
    { target: { name: "나경원", party: 'KH', desc: "5선" }, materials: ["김석기", "임이자"], base: "L1_KH" },
    { target: { name: "윤상현", party: 'KH', desc: "5선" }, materials: ["김희정", "신성범"], base: "L1_KH" },
    { target: { name: "조경태", party: 'KH', desc: "6선" }, materials: ["송석준", "이만희"], base: "L1_KH" },
    { target: { name: "조배숙", party: 'KH', desc: "5선" }, materials: ["신성범", "임이자"], base: "L1_KH" },
    { target: { name: "주호영", party: 'KH', desc: "6선" }, materials: ["김정재", "윤한홍"], base: "L1_KH" },
  ];

  const lv3_recipes_minor: Recipe[] = [
    { target: { name: "황운하", party: 'KOREA', desc: "조국혁신당" }, materials: ["권칠승", "김석기"], base: "L1_DM" },
    { target: { name: "윤종오", party: 'JINBO', desc: "진보당" }, materials: ["김교흥", "김성원"], base: "L1_DM" },
    { target: { name: "용혜인", party: 'MINOR', desc: "기본소득당" }, materials: ["김병기", "김정재"], base: "L1_DM" },
    { target: { name: "이준석", party: 'REFORM', desc: "개혁신당" }, materials: ["김성환", "김희정"], base: "L1_KH" },
    { target: { name: "한창민", party: 'MINOR', desc: "사회민주당" }, materials: ["김영진", "성일종"], base: "L1_DM" },
    { target: { name: "우원식", party: 'INDEP', desc: "무소속" }, materials: ["김영호", "송석준"], base: "L1_DM" },
  ];

  // --- Helper Components ---
  const PartyBadge = ({ party }: { party: Party }) => {
    let color = "bg-gray-500";
    let text = "";

    switch(party) {
      case 'DM': color = DM_COLOR; text = "민주"; break;
      case 'KH': color = KH_COLOR; text = "국힘"; break;
      case 'REFORM': color = REFORM_COLOR; text = "개혁"; break;
      case 'KOREA': color = KOREA_COLOR; text = "조국"; break;
      case 'JINBO': color = JINBO_COLOR; text = "진보"; break;
      case 'INDEP': color = "bg-gray-500"; text = "무소속"; break;
      case 'BASIC': color = "bg-slate-600"; text = "기초"; break;
      default: color = MINOR_COLOR; text = "군소";
    }

    return (
      <span className={`${color} text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap`}>
        {text}
      </span>
    );
  };

  const Lv1Badge = ({ type }: { type: 'L1_DM' | 'L1_KH' }) => (
    <div className={`flex items-center gap-1 px-2 py-1 rounded border ${type === 'L1_DM' ? 'border-blue-400 bg-blue-900/30 text-blue-200' : 'border-red-400 bg-red-900/30 text-red-200'}`}>
      <Users size={12} />
      <span className="text-xs font-bold">{type === 'L1_DM' ? '민주 지지층' : '국힘 지지층'}</span>
    </div>
  );

  const Lv2Card = ({ name, party }: { name: string, party: 'DM' | 'KH' }) => (
    <div className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border ${party === 'DM' ? 'border-blue-600 bg-blue-900/40' : 'border-red-600 bg-red-900/40'}`}>
      <span className={`w-2 h-2 rounded-full ${party === 'DM' ? 'bg-blue-400' : 'bg-red-400'}`}></span>
      <span className="text-xs text-gray-200 font-medium">{name}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900 text-gray-100 p-6 font-sans overflow-auto">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 text-transparent bg-clip-text">
            정랜디 (PRD) 조합 가이드 v1
          </h1>
          <p className="text-slate-400 text-sm">Politician Random Defense - Combination Formula</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          {[
            { id: 'lv1', label: 'Lv1 ~ Lv2 기초' },
            { id: 'lv2', label: 'Lv2 유닛 목록' },
            { id: 'lv3', label: 'Lv3 조합식 (핵심)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'lv1' | 'lv2' | 'lv3')}
              className={`px-6 py-2 rounded-full font-bold transition-all ${
                activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 min-h-[500px]">

          {/* TAB: Lv1 -> Lv2 */}
          {activeTab === 'lv1' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Shuffle className="text-green-400" />
                기초 조합 (Random Synthesis)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Recipe 1 */}
                 <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 flex flex-col items-center gap-4">
                    <div className="flex gap-2">
                      <div className="w-16 h-20 bg-red-900/50 border border-red-500 rounded flex flex-col items-center justify-center">
                        <Users size={20} className="text-red-400 mb-1"/>
                        <span className="text-xs text-red-200">국힘</span>
                        <span className="text-[10px] text-slate-400">Lv1</span>
                      </div>
                      <div className="flex items-center text-slate-500">+</div>
                      <div className="w-16 h-20 bg-red-900/50 border border-red-500 rounded flex flex-col items-center justify-center">
                        <Users size={20} className="text-red-400 mb-1"/>
                        <span className="text-xs text-red-200">국힘</span>
                        <span className="text-[10px] text-slate-400">Lv1</span>
                      </div>
                    </div>
                    <ArrowRight className="text-slate-500 rotate-90 md:rotate-0" />
                    <div className="w-full bg-slate-800 border border-slate-600 p-3 rounded text-center">
                      <p className="font-bold text-gray-200">랜덤 Lv2 의원</p>
                      <p className="text-xs text-slate-500 mt-1">(27종 중 1명)</p>
                    </div>
                 </div>

                 {/* Recipe 2 */}
                 <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 flex flex-col items-center gap-4">
                    <div className="flex gap-2">
                      <div className="w-16 h-20 bg-blue-900/50 border border-blue-500 rounded flex flex-col items-center justify-center">
                        <Users size={20} className="text-blue-400 mb-1"/>
                        <span className="text-xs text-blue-200">민주</span>
                        <span className="text-[10px] text-slate-400">Lv1</span>
                      </div>
                      <div className="flex items-center text-slate-500">+</div>
                      <div className="w-16 h-20 bg-blue-900/50 border border-blue-500 rounded flex flex-col items-center justify-center">
                        <Users size={20} className="text-blue-400 mb-1"/>
                        <span className="text-xs text-blue-200">민주</span>
                        <span className="text-[10px] text-slate-400">Lv1</span>
                      </div>
                    </div>
                    <ArrowRight className="text-slate-500 rotate-90 md:rotate-0" />
                    <div className="w-full bg-slate-800 border border-slate-600 p-3 rounded text-center">
                      <p className="font-bold text-gray-200">랜덤 Lv2 의원</p>
                      <p className="text-xs text-slate-500 mt-1">(27종 중 1명)</p>
                    </div>
                 </div>

                 {/* Recipe 3 */}
                 <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 flex flex-col items-center gap-4">
                    <div className="flex gap-2">
                      <div className="w-16 h-20 bg-red-900/50 border border-red-500 rounded flex flex-col items-center justify-center">
                        <Users size={20} className="text-red-400 mb-1"/>
                        <span className="text-xs text-red-200">국힘</span>
                      </div>
                      <div className="flex items-center text-slate-500">+</div>
                      <div className="w-16 h-20 bg-blue-900/50 border border-blue-500 rounded flex flex-col items-center justify-center">
                        <Users size={20} className="text-blue-400 mb-1"/>
                        <span className="text-xs text-blue-200">민주</span>
                      </div>
                    </div>
                    <ArrowRight className="text-slate-500 rotate-90 md:rotate-0" />
                    <div className="w-full bg-slate-800 border border-slate-600 p-3 rounded text-center">
                      <p className="font-bold text-gray-200">랜덤 Lv2 의원</p>
                      <p className="text-xs text-slate-500 mt-1">(27종 중 1명)</p>
                    </div>
                 </div>
              </div>

              <div className="bg-indigo-900/30 p-4 rounded border border-indigo-500/30 text-center text-indigo-200 text-sm">
                <Info size={16} className="inline mr-2 mb-1"/>
                어떤 Lv1 카드 2장을 섞어도 결과는 무조건 <strong>전체 Lv2 풀(27명) 중 랜덤 1명</strong>입니다.
              </div>
            </div>
          )}

          {/* TAB: Lv2 List */}
          {activeTab === 'lv2' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="text-yellow-400" />
                Lv2 일반 의원 목록 (27종)
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Democratic List */}
                <div className="bg-blue-950/30 rounded-xl p-4 border border-blue-800">
                  <h3 className="text-blue-400 font-bold mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    더불어민주당 (14명)
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {lv2_dm.map((unit, idx) => (
                      <div key={idx} className="bg-slate-800 p-2 rounded flex justify-between items-center text-sm hover:bg-slate-700 transition-colors">
                        <span className="text-gray-200">{unit.name}</span>
                        <span className="text-[10px] text-slate-500">{unit.role}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PPP List */}
                <div className="bg-red-950/30 rounded-xl p-4 border border-red-800">
                  <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    국민의힘 (13명)
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {lv2_kh.map((unit, idx) => (
                      <div key={idx} className="bg-slate-800 p-2 rounded flex justify-between items-center text-sm hover:bg-slate-700 transition-colors">
                        <span className="text-gray-200">{unit.name}</span>
                        <span className="text-[10px] text-slate-500">{unit.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Lv3 Recipes */}
          {activeTab === 'lv3' && (
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Crown className="text-purple-400" />
                  Lv3 핵심 중진 조합식 (26종)
                </h2>
                <span className="text-xs text-slate-400">Lv2 A + Lv2 B + Lv1(재료) = Lv3</span>
              </div>

              {/* Democratic Section */}
              <div className="space-y-4">
                <h3 className="text-blue-400 font-bold border-b border-blue-900 pb-2">더불어민주당 계열 (12명)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {lv3_recipes_dm.map((recipe, idx) => (
                    <div key={idx} className="bg-slate-900/50 border border-slate-700 p-3 rounded-lg flex flex-col gap-2 hover:border-blue-600 transition-colors group">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white group-hover:text-blue-400">{recipe.target.name}</span>
                          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{recipe.target.desc}</span>
                        </div>
                        <PartyBadge party='DM' />
                      </div>
                      <div className="h-px bg-slate-700/50 w-full"></div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Lv2Card name={recipe.materials[0]} party='DM' />
                        <span className="text-slate-500 text-xs">+</span>
                        <Lv2Card name={recipe.materials[1]} party='DM' />
                        <span className="text-slate-500 text-xs">+</span>
                        <Lv1Badge type={recipe.base} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PPP Section */}
              <div className="space-y-4 pt-4">
                <h3 className="text-red-400 font-bold border-b border-red-900 pb-2">국민의힘 계열 (8명)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {lv3_recipes_kh.map((recipe, idx) => (
                    <div key={idx} className="bg-slate-900/50 border border-slate-700 p-3 rounded-lg flex flex-col gap-2 hover:border-red-600 transition-colors group">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white group-hover:text-red-400">{recipe.target.name}</span>
                          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{recipe.target.desc}</span>
                        </div>
                        <PartyBadge party='KH' />
                      </div>
                      <div className="h-px bg-slate-700/50 w-full"></div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Lv2Card name={recipe.materials[0]} party='KH' />
                        <span className="text-slate-500 text-xs">+</span>
                        <Lv2Card name={recipe.materials[1]} party='KH' />
                        <span className="text-slate-500 text-xs">+</span>
                        <Lv1Badge type={recipe.base} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Minor/Indep Section */}
              <div className="space-y-4 pt-4">
                <h3 className="text-yellow-400 font-bold border-b border-yellow-900/30 pb-2">군소정당 및 무소속 (6명)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {lv3_recipes_minor.map((recipe, idx) => (
                    <div key={idx} className="bg-slate-900/50 border border-slate-700 p-3 rounded-lg flex flex-col gap-2 hover:border-yellow-600 transition-colors group">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white group-hover:text-yellow-400">{recipe.target.name}</span>
                          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 truncate max-w-[80px]">{recipe.target.desc}</span>
                        </div>
                        <PartyBadge party={recipe.target.party} />
                      </div>
                      <div className="h-px bg-slate-700/50 w-full"></div>
                      <div className="flex items-center flex-wrap gap-1.5 text-sm">
                        <Lv2Card name={recipe.materials[0]} party='DM' />
                        <span className="text-slate-500 text-xs">+</span>
                        <Lv2Card name={recipe.materials[1]} party='KH' />
                        <span className="text-slate-500 text-xs">+</span>
                        <Lv1Badge type={recipe.base} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        <div className="text-center text-slate-500 text-xs">
           Jeong-Ran-Di Data Visualization v1.0
        </div>
      </div>
    </div>
  );
};

export default RecipesGuide;
