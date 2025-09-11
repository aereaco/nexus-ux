import combobox from './combobox'
import dialog from './dialog'
import disclosure from './disclosure'
import listbox from './listbox'
import popover from './popover'
import menu from './menu'
import notSwitch from './switch'
import radio from './radio'
import tabs from './tabs'

export default function (State: any) {
    combobox(State)
    dialog(State)
    disclosure(State)
    listbox(State)
    menu(State)
    notSwitch(State)
    popover(State)
    radio(State)
    tabs(State)
}
