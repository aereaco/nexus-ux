/**
 *  __    _                             _    _ _    __
 * |  \  | |                           | |  | \ \  / /
 * | \ \ | | __ __  _ _   _ ____       | |  | |\ \/ /
 * | |\ \| |/ _ \ \/ | | | / __/  ___  | |  | | >  <
 * | | \ | |  __/>  <| |_| \__ \ |___| | |__| |/ /\ \
 * |_|  \__|\___/_/\_|____/\___/       |______/_/  \_\
 *`
 * Let's build Nexus-UX together. It's easier than you think.
 * For starters, we'll import its core object called "State". This is the
 * object that will expose all of Nexus-UX's public API.
 */
import State from './engine/state'

/**
 * _______________________________________________________
 * The Evaluator
 * -------------------------------------------------------
 *
 * Now we're ready to bootstrap Nexus-UX's evaluation system.
 * It's the function that converts raw JavaScript string
 * expressions like @click="toggle()", into actual JS.
 */
import { normalEvaluator } from './engine/evaluator'

State.setEvaluator(normalEvaluator)

/**
 * _______________________________________________________
 * The Reactivity Engine
 * -------------------------------------------------------
 *
 * This is the reactivity core of Nexus-UX. It's the part
 * that triggers an element with data-text="message"
 * to update its inner text when "message" is changed.
 */
import { reactive, effect, stop, toRaw } from '@vue/reactivity'

State.setReactivityEngine({ reactive, effect, release: stop, raw: toRaw })

/**
 * _______________________________________________________
 * The Magics
 * -------------------------------------------------------
 *
 * Yeah, we're calling them magics here like they're nouns.
 * These are the properties that are magically available
 * to all the State expressions, within your web app.
 */
import './magics/$dispatch'
import './magics/$el'
import './magics/$id'
import './magics/$nextTick'
import './magics/$refs'
import './magics/$root'
import './magics/$signal'
import './magics/$store'
import './magics/$watch'

/**
 * _______________________________________________________
 * The Directives
 * -------------------------------------------------------
 *
 * Now that the core is all set up, we can register State
 * directives like data-text or data-on that form the basis of
 * how State adds behavior to an app's static markup.
 */
import './directives/anchor'
import './directives/bind'
import './directives/cloak'
import './directives/collapse'
import './directives/component'
import './directives/effect'
import './directives/focus'
import './directives/for'
import './directives/html'
import './directives/id'
import './directives/if'
import './directives/ignore'
import './directives/init'
import './directives/intersect'
import './directives/mask'
import './directives/model'
import './directives/modelable'
import './directives/on'
import './directives/persist'
import './directives/ref'
import './directives/resize'
import './directives/show'
import './directives/signal'
import './directives/sort'
import './directives/teleport'
import './directives/text'
import './directives/transition'

/**
 * _______________________________________________________
 * The Global State Object
 * -------------------------------------------------------
 *
 * Now that we have set everything up internally, anything
 * State-related that will need to be accessed on-going
 * will be made available through the global "State" object.
 */
export default State