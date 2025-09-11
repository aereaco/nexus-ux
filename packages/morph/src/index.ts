import { morph, morphBetween } from './morph'

export default function (State: any) {
    State.morph = morph
    State.morphBetween = morphBetween
}

export { morph, morphBetween }
