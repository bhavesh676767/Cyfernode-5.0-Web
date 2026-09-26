window.CYFERNODE_EVENTS = [
  { id: 'fontastic', name: 'Fontastic', category: 'Poster Designing' },
  { id: 'blendered', name: 'Blendered', category: '3D Modeling' },
  { id: 'unscripted', name: 'Unscripted', category: 'Movie Making' },
  { id: 'clue-less', name: 'Clue-Less', category: 'Cyber Investigation' },
  { id: 'runtime-terror', name: 'Runtime Terror', category: 'Competitive Programming' },
  { id: 'buildout', name: 'Buildout', category: 'SAAS Product Development' },
  { id: 'breadboard', name: 'Breadboard', category: 'Hardware Engineering' },
  { id: 'wireframe', name: 'Wireframe', category: 'UI/UX Design' },
  { id: 'entrepreneur-exe', name: 'Entreprenuer.exe', category: 'Innovation & Pitching' },
  { id: 'unbranded', name: 'Unbranded', category: 'Rebranding' },
]

window.getCyfernodeEventByPromptSlug = function getCyfernodeEventByPromptSlug(slug) {
  if (!slug || !slug.endsWith('-prompt')) return null
  const id = slug.slice(0, -'-prompt'.length)
  return window.CYFERNODE_EVENTS.find((event) => event.id === id) || null
}
