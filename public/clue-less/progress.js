import {
  LEVEL_ORDER,
  loadProgress,
  saveProgress,
  isLevelUnlocked,
  completeVoidLevel,
  resetAllProgress,
} from './lib/state.js'

window.CYFERNODE_CLUE_LESS_LEVELS = LEVEL_ORDER

window.getClueLessProgress = function getClueLessProgress() {
  return loadProgress()
}

window.isClueLessLevelUnlocked = function isClueLessLevelUnlocked(levelId) {
  return isLevelUnlocked(loadProgress(), levelId)
}

window.isClueLessLevelComplete = function isClueLessLevelComplete(levelId) {
  return loadProgress().completed.includes(levelId)
}

window.completeClueLessLevel = function completeClueLessLevel(levelId) {
  let progress = loadProgress()
  if (levelId === 'void') {
    progress = completeVoidLevel(progress)
  } else if (LEVEL_ORDER.includes(levelId) && !progress.completed.includes(levelId)) {
    progress.completed.push(levelId)
  }
  saveProgress(progress)
  return progress
}

window.resetClueLessProgress = function resetClueLessProgress() {
  saveProgress(resetAllProgress())
}
