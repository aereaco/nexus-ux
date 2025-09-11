import { dispatch } from '../utils/dispatch'
import { magic } from '../engine/magics'

// Register $dispatch magic
magic('dispatch', (el: any) => dispatch.bind(dispatch, el))
