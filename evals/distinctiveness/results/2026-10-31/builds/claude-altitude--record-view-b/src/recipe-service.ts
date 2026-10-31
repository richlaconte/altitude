// In-memory stand-in for the kitchen's recipe service. A real service owns persistence, permissions and the
// revision check; this one imitates them so the page can be exercised: saves take a moment, a stale revision is
// refused, and adding #fail-save to the URL makes the next saves fail.
import { CURRENT_USER, INITIAL_DETAILS, type RecipeChange, type RecipeDetails } from './recipe-data';

let stored: RecipeDetails = INITIAL_DETAILS;
let revision = 7;
let nextChange = 5;

export const currentRevision = () => revision;

export interface SaveOutcome {
  details: RecipeDetails;
  revision: number;
  change: RecipeChange | null;
}

export async function saveRecipeDetails(draft: RecipeDetails, baseRevision: number): Promise<SaveOutcome> {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (location.hash.includes('fail-save')) throw new Error('The recipe book couldn’t be reached. Your changes are still here; try again.');
  if (baseRevision !== revision) throw new Error('Someone else changed this recipe while you were editing. Reload it to see their changes.');

  const before: Partial<RecipeDetails> = {};
  const after: Partial<RecipeDetails> = {};
  for (const key of Object.keys(draft) as (keyof RecipeDetails)[]) {
    if (draft[key] !== stored[key]) {
      (before as Record<string, unknown>)[key] = stored[key];
      (after as Record<string, unknown>)[key] = draft[key];
    }
  }
  const changed = Object.keys(after).length > 0;
  stored = { ...draft };
  if (changed) revision += 1;
  const change = changed
    ? { id: `c${nextChange++}`, time: new Date().toISOString(), actor: CURRENT_USER, before, after }
    : null;
  return { details: stored, revision, change };
}
