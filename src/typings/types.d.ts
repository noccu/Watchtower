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

interface CachedUser extends User, TwitterUser {
    /** Contains refs to lists the user is on. */
    onLists?: List[]
}

/** A list following a specific theme. Only main properties listed. */
interface List {
    /** List name. */
    name: string
    /** The label to display on posts. */
    label: string
    /** The message to display on profiles0 */
    msg: string
    /** The color to use for list UI elements. */
    color: string
    /** The main/support page of the list. */
    homepage: string
    /** Download/update URL of the list. */
    source: string
    /** Users on the list, split by platform (key). */
    users: Object.<string, User[]>
}