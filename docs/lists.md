# How to create and manage lists
> **Note: some functionality might not be implemented yet**  

Lists are a collection of users of a platform (those supported by Watchtower), grouped under the list's specific topic or goal.
Any user on a list is marked with the list's label across the platform, and a longer message on their specific profile page.  
Lists can be loaded locally from your storage, or from the internet. Once one is added, it will automatically update based on your settings. If the location of the list changes, you'll have to re-add it.

**Lists can be created by anyone. Their management is up to their creators and curators. Watchtower cannot and does not guarantee their correctness nor any other metric and can not be held responsible for any aspect of them.**

## Adding a list
Open the settings page, paste the location of the list in the "add list" box, and hit enter.
The location should result in JSON data (usually a `.json` file) and can be a URL for lists on the internet, or a valid path for local files.

## Creating a list
Copy the [template](list-template.json) as a starting point and rename it. 

> This file is in JSON format, which is a common interchange format for storing simple structured data. Straight brackets `[]` create lists. Curly brackets `{}` create blocks. Within a block, *pairs* map keys to values `"key": value`. Values can be a list, block, string, or number. Lists and pairs are comma-separated.

Note: Currently Watchtower uses browser storage to save lists. This forcefully re-orders object keys in alphabetical order ~~for some fucking reason~~, leading to exports not retaining original key order. Export new lists before version control to prevent superfluous changes.

Open the copied file in a text editor and fill out the information in the meta block as described. 

## Adding users
Edit the contents of the users block as required to add your users. If you will be adding users programmatically (recommended), you can delete the entire contents of the users block. 
Otherwise, create a block in the users block for each supported platform you have users to add for, then add the information for your users. Basic information is provided in the template. For more details, refer to ~~[this link]()~~ each platform's content script.
 
Watchtower provides all required info when using the report function, which can itself also be used for basic programmatic adding combined with list exports. Other methods of obtaining the info or creating lists are out of the scope of this documentation.

The basic functionality provided works as follows:
- [Report a user](reporting.md).
- Choose "local only" in the report options.
- Repeat for all users you wish to add.
- Open Watchtower's settings.
- Export your list and choose to include reports.
    - Optional: overwrite the original list and reload the list using the button.
- If your list is available to others, replace the old list with your exported list at the same location.

## Editing & Removing users
Open the list file, search for and edit or remove the user. Save & reload the list.  
Further details to be implemented.

## Sharing lists
Lists are simple files and can be shared and used simply by making the .json file available, or providing an endpoint that returns the list's JSON data. 
It is intended that lists are uploaded to online storage with a consistent URL to allow widespread access and automatic updating.