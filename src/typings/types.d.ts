/** A platform user part of a list. */
interface User {
    /** Platform username/handle. Required. */
    user: string
    /** Platform ID of the user. This is used as main key. */
    id: string
}

interface TwitterUser extends User {
    /** Some kinda new id? Unsure, but saving in case. */
    hash: string
}

// No longer used atm.
interface CachedUser extends User, TwitterUser {
    /** Contains refs to lists the user is on. */
    onLists?: List[]
}

/** Parts of a list used in marking users */
interface ListMarkers {
    /** The label to display on posts. */
    label: string
    /** The message to display on profiles0 */
    msg: string
    /** The color to use for list UI elements. */
    color: string
}

/** A list following a specific theme. */
interface List extends ListMarkers {
    /** List name. */
    name: string
    /** The main/support page of the list. */
    homepage: string
    /** Download/update URL of the list. Also used as UID*/
    source: string
    /** The way new users should be reported. Provides consistent standards for implementations. */
    reportType: "api" | "gh" | "gl" | "manual",
    /** URL to use for reports */
    reportTarget: string
    /** Data required by reportType */
    reportData: string
    /** Users on the list, split by platform (key). */
    users: Object.<string, User[]>
}

interface Settings {
    //todo
}

interface Config {
    /** Extension settings */
    settings: Settings
    /** The saved lists, as downloaded + extra metadata  */
    lists: List[]
}