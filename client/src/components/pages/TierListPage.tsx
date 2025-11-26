import { useNavigate } from 'react-router-dom';
import { allCharacters, ahnCheolsooLine, leeJaemyungLine } from '@/data/characters';
import { Rarity, Party } from '@/types';
import styles from './TierListPage.module.css';

const rarityNames: Record<Rarity, string> = {
  [Rarity.COMMON]: '일반',
  [Rarity.SPECIAL]: '특별',
  [Rarity.RARE]: '고급',
  [Rarity.LEGENDARY]: '전설',
  [Rarity.MYTHIC]: '신화',
};

export function TierListPage() {
  const navigate = useNavigate();

  // Group characters by rarity
  const charactersByRarity = Object.values(Rarity).reduce((acc, rarity) => {
    acc[rarity] = allCharacters.filter(c => c.rarity === rarity);
    return acc;
  }, {} as Record<Rarity, typeof allCharacters>);

  return (
    <div className={styles.tierList}>
      <header className={styles.header}>
        <button className={`btn ${styles.backButton}`} onClick={() => navigate('/')}>
          ← 로비로
        </button>
        <h1>📊 티어 리스트</h1>
        <div className={styles.spacer} />
      </header>

      <main className={styles.content}>
        {/* Unique Evolution Lines */}
        <section className={styles.section}>
          <h2>🌟 유니크 정치인 진화 라인</h2>

          <div className={styles.evolutionLine}>
            <h3 className={styles.lineTitle}>안철수</h3>
            <div className={styles.lineCards}>
              {ahnCheolsooLine.map(char => (
                <div
                  key={char.id}
                  className={`${styles.card} ${styles[`rarity-${char.rarity}`]}`}
                >
                  <div className={styles.cardRarity}>{rarityNames[char.rarity]}</div>
                  <div className={styles.cardName}>{char.formName}</div>
                  <div className={styles.cardStats}>
                    ATK: {char.baseStats.atk} | HP: {char.baseStats.hp}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.evolutionLine}>
            <h3 className={styles.lineTitle}>이재명</h3>
            <div className={styles.lineCards}>
              {leeJaemyungLine.map(char => (
                <div
                  key={char.id}
                  className={`${styles.card} ${styles[`rarity-${char.rarity}`]}`}
                >
                  <div className={styles.cardRarity}>{rarityNames[char.rarity]}</div>
                  <div className={styles.cardName}>{char.formName}</div>
                  <div className={styles.cardStats}>
                    ATK: {char.baseStats.atk} | HP: {char.baseStats.hp}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* All Characters by Rarity */}
        <section className={styles.section}>
          <h2>📋 전체 캐릭터</h2>

          {Object.values(Rarity).reverse().map(rarity => (
            <div key={rarity} className={styles.tierRow}>
              <div className={`${styles.tierLabel} ${styles[`rarity-${rarity}`]}`}>
                {rarityNames[rarity]}
              </div>
              <div className={styles.tierCards}>
                {charactersByRarity[rarity].map(char => (
                  <div
                    key={char.id}
                    className={`${styles.miniCard} ${styles[`party-${char.party}`]}`}
                    title={`${char.name}${char.formName ? ` (${char.formName})` : ''}\nATK: ${char.baseStats.atk} | HP: ${char.baseStats.hp}`}
                  >
                    <span className={styles.miniName}>
                      {char.isUnique ? char.formName : char.name}
                    </span>
                    <span className={styles.miniParty}>
                      {char.party === Party.KUK ? '🔵' : char.party === Party.MIN ? '🟠' : '⚪'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
