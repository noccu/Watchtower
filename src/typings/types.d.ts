/** A platform user part of a list. */
interface User {
    /** Platform username/handle. Required. */
    name: string
    /** The main platform ID of the user. Used as lookup key. */
    id: string
    /** [Twitter] Some kinda new id? Unsure, but saved in case. */
    hash?: string
}

/** A serialized version of the {@link CachedUser} class. */
interface SerializedUser {
    user: User
    /** Contains refs to lists the user is on. */
    onLists: SerializedList[]
}

/** The object format returned by content script msg replies. */
interface CSUser extends User {
    /** Platform the user belongs to. */
    platform: PLATFORM
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
    /** The list's metadata. */
    meta: ListMeta
    /** Users on the list, split by platform. */
    users: PlatformKeyed<User[]>
    /** Data added locally for various reasons. */
    local: LocalListData
    /** Local storage for reports. */
    reports: PlatformKeyed<User[]>
}

/** A serialized version of the {@link CachedList} class. */
type SerializedList = Omit<List, "users">

type PLATFORMS = {
    twitter,
    pixiv
}
type PLATFORM = keyof PLATFORMS
type PlatformKeyed<T> = {[plat in PLATFORM]: T}

interface Settings {
    lastUpdate: number
    updateInterval: number
}

interface Config {
    /** Extension settings */
    settings: Settings
    /** The saved lists, as downloaded + extra metadata  */
    lists: List[]
}

interface ReportOptions {
    /** Only save to list's report block, do not send data. */
    localOnly: boolean
    /** Request review to remove user from list. */
    appeal: boolean
}