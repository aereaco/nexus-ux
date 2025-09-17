import { scope } from '../engine/scope'
import { sprite } from '../engine/sprites'

sprite('signal', (el: any) => scope(el))
