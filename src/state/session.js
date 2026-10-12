export const PROJECT_IDS = Array.from({ length: 6 }, (_, i) => `project-0${i + 1}`);
const idsOf = projects => projects.map(project => typeof project==='string'?project:project.id);
export function complete(previous, id, projects=PROJECT_IDS) {
  const ids=idsOf(projects);
  const next = new Set(previous);
  if (id === 'portfolio') ids.forEach(key => next.add(key));
  else if (id === 'profile' || id === 'contact' || ids.includes(id)) next.add(id);
  return next;
}
export function counts(viewed, projects=PROJECT_IDS) {
  return { profile: Number(viewed.has('profile')), portfolio: idsOf(projects).filter(id => viewed.has(id)).length, contact: Number(viewed.has('contact')) };
}
