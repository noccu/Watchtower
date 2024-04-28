/** A platform user part of a list. */
interface User {
    /** Platform username/handle. Required. */
    user: string
    /** The main platform ID of the user. Used as lookup key. Required*/
    id: string
    /** [Twitter] Some kinda new id? Unsure, but saved in case. */
    hash?: string
}

/** A user cached for fast lookup. Implemented by CachedUser class. */
interface LoadedUser {
    user: User
    /** Contains refs to lists the user is on. */
    onLists: LoadedList[]
}

/** A list's metadata schema, holding all public info. */
interface ListMeta {
    /** List name. */
    name: string
    /** The label to display on posts. */
    label: string
    /** The message to display on profiles */
    msg: string
    /** The color to use for list UI elements. */
    color: string
    /** The person/people responsible for curating the list. */
    curation: string | Array<string>
    /** The main/support page of the list. */
    homepage: string
    /** The way new users should be reported.
     * Provides consistent standards for implementations.
     * Report keys should be omitted if reporting is not supported. */
    reportType?: "api" | "gh" | "gl" | "manual",
    /** URL to use for reports */
    reportTarget?: string
    /** Data required by reportType */
    reportData?: any
}

/** Information added by Watchtower on download for various uses. */
interface LocalListData {
    /** Download/update URL of the list. Also used as UID */
    source: string
    /** The total number of users */
    size: number
}

/** Defines the full internal schema of a saved list. */
interface List {
    /** The list's metadata */
    meta: ListMeta
    /** Data added locally for various reasons */
    local: LocalListData
    /** Users on the list, split by platform. */
    users: PlatformKeyed<User[]>
}

/** A List wrapper for most uses & serialization. Implemented by CachedList class. */
interface LoadedList extends Omit<List, "users">{
    /** Link to full list as originally loaded from storage. Non-enumerable. */
    readonly full: List
}

type PLATFORMS = {
    twitter,
    pixiv
}
type PLATFORM = keyof PLATFORMS
type PlatformKeyed<T> = {[plat in PLATFORM]: T}

interface Settings {
    //todo
}

interface Config {
    /** Extension settings */
    settings: Settings
    /** The saved lists, as downloaded + extra metadata  */
    lists: List[]
}