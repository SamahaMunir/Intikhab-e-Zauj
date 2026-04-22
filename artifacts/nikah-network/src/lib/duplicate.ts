export function findFuzzyDuplicates(user: any, allUsers: any[]) {
  return allUsers
    .filter(u => u.id !== user.id)
    .map(u => ({ user: u, score: Math.random() * 100 }))
    .sort((a, b) => b.score - a.score);
}
