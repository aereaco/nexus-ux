import { dispatch } from '../utils/dispatch'
import { sprite } from '../engine/sprites'

// Register $dispatch sprite
sprite('dispatch', (el: any) => dispatch.bind(dispatch, el))
