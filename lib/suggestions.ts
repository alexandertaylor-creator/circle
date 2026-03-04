const DEFAULT_INTERESTS = [
  "Coffee",
  "Fitness",
  "Travel",
  "Food",
  "Music",
  "Movies",
  "Sports",
  "Hiking",
  "Gaming",
  "Reading",
  "Cooking",
  "Art",
];

const DEFAULT_GROUPS = [
  "Work",
  "Family",
  "College Friends",
  "High School",
  "Neighbors",
  "Gym",
  "Book Club",
];

const INTERESTS_CAP = 12;
const GROUPS_CAP = 8;
const INTERESTS_SUPPLEMENT_THRESHOLD = 5;
const GROUPS_SUPPLEMENT_THRESHOLD = 3;

function normalizedIn(list: string[], item: string) {
  const lower = item.toLowerCase();
  return list.some((x) => x.toLowerCase() === lower);
}

/** Database interests first; if fewer than 5, add defaults not already in list. Cap total at 12. */
export function supplementInterests(dbList: string[]): string[] {
  const unique = Array.from(new Set(dbList)).sort();
  if (unique.length >= INTERESTS_SUPPLEMENT_THRESHOLD) {
    return unique.slice(0, INTERESTS_CAP);
  }
  const toAdd = DEFAULT_INTERESTS.filter((d) => !normalizedIn(unique, d)).slice(
    0,
    INTERESTS_CAP - unique.length
  );
  return [...unique, ...toAdd].slice(0, INTERESTS_CAP);
}

/** Database groups first; if fewer than 3, add defaults not already in list. Cap total at 8. */
export function supplementGroups(dbList: string[]): string[] {
  const unique = Array.from(new Set(dbList)).sort();
  if (unique.length >= GROUPS_SUPPLEMENT_THRESHOLD) {
    return unique.slice(0, GROUPS_CAP);
  }
  const toAdd = DEFAULT_GROUPS.filter((d) => !normalizedIn(unique, d)).slice(
    0,
    GROUPS_CAP - unique.length
  );
  return [...unique, ...toAdd].slice(0, GROUPS_CAP);
}
