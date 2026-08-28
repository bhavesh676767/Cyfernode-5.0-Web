/**
 * @typedef {'stereo' | 'left' | 'right'} EchoChannelMode
 */

/**
 * @typedef {Object} EchoConfig
 * @property {string} id
 * @property {string} levelId
 * @property {string} title
 * @property {string[]} intro
 * @property {{ src: string, channels: EchoChannelMode[] }} audio
 * @property {{ enabled: boolean, text: string, lastDetectedWord: string, inspectionLabel: string }} transcript
 * @property {{ intermediate: string, positions: number[], changedWordIndices: number[] }} extraction
 * @property {{ sequence: string[] }} environment
 * @property {{ validationId: string }} final
 * @property {string} nextLevelPath
 * @property {string[]} playbackSpeeds
 */

export {}
