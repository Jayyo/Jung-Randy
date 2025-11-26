import {
  CharacterInstance,
  Recipe,
  RecipeIngredient,
  Party,
  Rarity,
} from '@/types';
import { allRecipes } from '@/data/recipes';
import { getCharacterById } from '@/data/characters';

/**
 * CombineSystem - Handles character combining/evolution logic
 */
export class CombineSystem {
  /**
   * Find all recipes that can be made with current inventory
   */
  findAvailableRecipes(inventory: CharacterInstance[]): Recipe[] {
    return allRecipes.filter(recipe =>
      this.canMakeRecipe(recipe, inventory)
    );
  }

  /**
   * Check if a specific recipe can be made with current inventory
   */
  canMakeRecipe(recipe: Recipe, inventory: CharacterInstance[]): boolean {
    // Create a copy of inventory to track usage
    const available = [...inventory.filter(c => !c.isDeployed)];

    for (const ingredient of recipe.ingredients) {
      const matched = this.findMatchingCharacters(ingredient, available);

      if (matched.length < ingredient.count) {
        return false;
      }

      // Remove matched characters from available pool
      for (let i = 0; i < ingredient.count; i++) {
        const index = available.findIndex(
          c => c.instanceId === matched[i].instanceId
        );
        if (index !== -1) {
          available.splice(index, 1);
        }
      }
    }

    return true;
  }

  /**
   * Execute a recipe - combine characters
   * Returns the new character instance, or null if failed
   */
  executeRecipe(
    recipe: Recipe,
    inventory: CharacterInstance[],
    removeFromInventory: (id: string) => void,
    addToInventory: (instance: CharacterInstance) => void
  ): CharacterInstance | null {
    if (!this.canMakeRecipe(recipe, inventory)) {
      return null;
    }

    // Collect characters to consume
    const available = [...inventory.filter(c => !c.isDeployed)];
    const toConsume: CharacterInstance[] = [];

    for (const ingredient of recipe.ingredients) {
      const matched = this.findMatchingCharacters(ingredient, available);

      for (let i = 0; i < ingredient.count; i++) {
        toConsume.push(matched[i]);
        const index = available.findIndex(
          c => c.instanceId === matched[i].instanceId
        );
        if (index !== -1) {
          available.splice(index, 1);
        }
      }
    }

    // Create result character
    const resultCharacter = getCharacterById(recipe.resultCharacterId);
    if (!resultCharacter) {
      console.error(`Recipe result character not found: ${recipe.resultCharacterId}`);
      return null;
    }

    const newInstance: CharacterInstance = {
      instanceId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      character: resultCharacter,
      currentStats: { ...resultCharacter.baseStats },
      position: { x: 0, y: 0 },
      skillCooldowns: new Map(),
      activeBuffs: [],
      isDeployed: false,
    };

    // Remove consumed characters
    for (const char of toConsume) {
      removeFromInventory(char.instanceId);
    }

    // Add new character
    addToInventory(newInstance);

    return newInstance;
  }

  /**
   * Find characters in inventory matching an ingredient requirement
   */
  private findMatchingCharacters(
    ingredient: RecipeIngredient,
    available: CharacterInstance[]
  ): CharacterInstance[] {
    return available.filter(char => {
      // Exact character match
      if (ingredient.characterId) {
        return char.character.id === ingredient.characterId;
      }

      // Party + Rarity match
      let matches = true;

      if (ingredient.party !== undefined) {
        matches = matches && char.character.party === ingredient.party;
      }

      if (ingredient.rarity !== undefined) {
        matches = matches && char.character.rarity === ingredient.rarity;
      }

      // Don't use unique characters as generic material
      if (!ingredient.characterId && char.character.isUnique) {
        return false;
      }

      return matches;
    });
  }

  /**
   * Get possible evolution paths for a character
   */
  getEvolutionPaths(characterId: string): Recipe[] {
    return allRecipes.filter(recipe =>
      recipe.ingredients.some(i => i.characterId === characterId)
    );
  }

  /**
   * Check if character can evolve with current inventory
   */
  canEvolve(characterId: string, inventory: CharacterInstance[]): Recipe | null {
    const paths = this.getEvolutionPaths(characterId);

    for (const recipe of paths) {
      if (this.canMakeRecipe(recipe, inventory)) {
        return recipe;
      }
    }

    return null;
  }

  /**
   * Get hint text for what's needed to complete a recipe
   */
  getRecipeHint(recipe: Recipe, inventory: CharacterInstance[]): string {
    const available = [...inventory.filter(c => !c.isDeployed)];
    const missing: string[] = [];

    for (const ingredient of recipe.ingredients) {
      const matched = this.findMatchingCharacters(ingredient, available);
      const needed = ingredient.count - matched.length;

      if (needed > 0) {
        if (ingredient.characterId) {
          const char = getCharacterById(ingredient.characterId);
          missing.push(`${char?.name ?? ingredient.characterId} x${needed}`);
        } else {
          const partyName = ingredient.party === Party.KUK ? '국힘' : '민주';
          const rarityName = this.getRarityName(ingredient.rarity!);
          missing.push(`${partyName} ${rarityName} x${needed}`);
        }
      }

      // Update available for next ingredient
      for (let i = 0; i < Math.min(ingredient.count, matched.length); i++) {
        const index = available.findIndex(
          c => c.instanceId === matched[i].instanceId
        );
        if (index !== -1) {
          available.splice(index, 1);
        }
      }
    }

    if (missing.length === 0) {
      return '합성 가능!';
    }

    return `필요: ${missing.join(', ')}`;
  }

  private getRarityName(rarity: Rarity): string {
    const names: Record<Rarity, string> = {
      [Rarity.COMMON]: '초선',
      [Rarity.SPECIAL]: '재선',
      [Rarity.RARE]: '다선',
      [Rarity.LEGENDARY]: '전설',
      [Rarity.MYTHIC]: '신화',
    };
    return names[rarity] ?? rarity;
  }
}
