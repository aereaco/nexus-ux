import { morph, morphBetween } from './morph'

export default function (Alpine: any) {
    Alpine.morph = morph
    Alpine.morphBetween = morphBetween
}

export { morph, morphBetween }
