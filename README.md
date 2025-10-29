# PPfilter
Userscript for filtering images on 4chan /mlp/ by data-md5. Works on any board, just adjust the url.

This repository includes approximately 200k MD5s of barbie images.

# Installation

1. Have Greasemonkey or Tampermonkey installed
2. Click this link to install the script: https://github.com/ponyman68/PPfilter/raw/main/ppfilter.user.js
3. On the top right of /mlp/ click the Options button and populate your database:
    * Copy url into the import text box:
        ```
        https://raw.githubusercontent.com/ponyman68/PPfilter/main/mymd5s.json
        ```
    * copy/paste your 4chanX MD5 filter list from 4chanX->settings->Filter->MD5 into the TextArea. 

# Why use this over my existing 4chan X Md5 filter setup?

* better performance, filtered images are never loaded
* 1 click hiding 

# Usage

Install the userscript and navigate to /mlp/. Every image has a hide/show button, which adds or removes its MD5 from your local storage databse. On the top right of the page is a button with import/export options for your local storage database. This repository contains an example database.

# Clearing All Local Data

Using "clear all local data" in your browser also clears this extension's store. When circumventing 4chan bans: Clear only the cookies (console (F12) on 4chan, click on storage manager, manually clear the "cookies" entry)

# Limitations

Interferes with MD5-related 4chan X functionality (ex. thread collapsing based on image MD5s doesn't work after this script removes the images) 

## Known issues

* doesn't work in 4chan catalog which doesn't currently expose md5s.
